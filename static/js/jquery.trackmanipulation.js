/*!
 * Koala trackmanipulation jQuery Plugin v3.10.0
 * https://github.com/visionect/koalalib
 *
 * Copyright 2014 Visionect d.o.o.
 * Released under the MIT license
 *
 * Date: 2014-01-27T11:18Z
 */


(function($, window, document) {

    if (typeof window.okular == 'undefined') {
        window.okular = {
            fake: true,
            KoalaNochange: function() {
                console.log("FAKE: sending no change.")
            },
            Beep: function(beep_type) {
                console.log("FAKE: " + beep_type==okular.BeepSoft ? "soft" : "hard" + " beep.");
            },
            BeepSoft: 1,
            BeepHard: 2,
            SetFrontligh: function(brightness) {
                console.log("FAKE: setting front light to " + brightness);
            },
            KoalaRenderRectangles: function() {},
            KoalaRender: function() {},
            KoalaUseA2Waveform: function() {},
            KoalaInverseNextRender: function() {},
            nm_host: undefined,
            device_uuid: undefined,
            RSSI: -1,
            BatteryLevel: -1,
            ExternalBatteryLevel: -1,
            Temperature: -1,
            Charger: -1
        };
    }

    $.extend(window.okular, {
        init: function(options) {
            this.rectangles = [];
            this.nextUpdate = null;
            this.settings = $.extend({}, this.defaults, options);
            if (!okular.fake && options && !('debug' in options)) {
                this.settings.debug = false;
            }

            $('#tmOverlay').remove();
            if (this.settings.debug) {
                overlay = $('<div id="tmOverlay"></div>').css({
                    position: 'absolute',
                    width: this.settings.width-4,
                    height: this.settings.height-4,
                    top: this.settings.position == 'right' ? 0 : this.settings.height+this.settings.debugOffset,
                    left: this.settings.position == 'right' ? this.settings.width+this.settings.debugOffset : 0,
                    border: '2px solid red',
                    opacity: 0.4
                });
                $('body').append(overlay);
            }
        },

        add: function(options) {
            var rectangle = $.extend({}, this.defaultRectangleOptions, {combine: this.settings.combineRectangles}, options);
            if ('width' in rectangle && 'height' in rectangle) {

                
                var same = $.grep(this.rectangles, function(e) {
                    return  e.width == rectangle.width &&
                            e.height == rectangle.height &&
                            e.top == rectangle.top &&
                            e.left == rectangle.left;
                });

                if (same.length == 0) {
                    rectangle.timestamp = new Date();
                    this.rectangles.push(rectangle);
                    
                    if (this.rectangles.length == 1) {
                        var timeout = this.nextUpdate ? this.nextUpdate - (new Date()) : this.settings.timeoutFirst;
                        if (timeout < this.settings.timeoutFirst ) {
                            timeout = this.settings.timeoutFirst;
                        }
                        window.setTimeout($.proxy(this.sendToKoala, this), timeout);
                    }
                } else {
                    same = same[0];
                    same.A2 |= rectangle.A2;
                    same.inverse |= rectangle.inverse;
                    same.bitDepth = Math.max(rectangle.bitDepth, same.bitDepth);
                    same.dithering = Math.max(rectangle.inverse, same.dithering);
                    same.renderDelay = Math.min(rectangle.renderDelay, same.renderDelay);
                }
            } else {
                throw new Error("Rectangle must have width and height properties!");
            }
        },

        sendToKoala: function() {
            var koalaRectangles = [],
                now = new Date(),
                nextCallTimeout = this.settings.timeoutFirst,
                bitDepth = -1,
                A2 = false,
                inverse = false,
                dithering = 0,
                self = this;

            if (this.settings.debug) {
                $('.tmRectangle').remove();
            }

            var currentRectangles = $.grep(this.rectangles, function(e) {
                return (now - e.timestamp >= e.renderDelay);
            });

            var combinable = $.grep(currentRectangles, function(e) {
                return e.combine == true;
            });

            // rectangles can be combined
            if (combinable.length > 0) {
                var rectangle = $.extend({}, this.defaultRectangleOptions, {right: 0, bottom: 0, left: 10000, top: 10000, bitDepth: -1});
                $.each(combinable, function(index) {
                    rectangle.left = Math.min(rectangle.left, this.left);
                    rectangle.top = Math.min(rectangle.top, this.top);

                    rectangle.right = Math.max(rectangle.right, this.left+this.width);
                    rectangle.bottom = Math.max(rectangle.bottom, this.top+this.height);

                    rectangle.A2 |= this.A2;
                    rectangle.inverse |= this.inverse;
                    rectangle.bitDepth = Math.max(rectangle.bitDepth, this.bitDepth);
                    rectangle.dithering = Math.max(rectangle.dithering, this.dithering);

                    self.rectangles.splice(self.rectangles.indexOf(this), 1);
                    currentRectangles.splice(currentRectangles.indexOf(this), 1);
                });

                rectangle.width = rectangle.right-rectangle.left;
                rectangle.height = rectangle.bottom-rectangle.top;

                self.rectangles.push(rectangle);
                currentRectangles.push(rectangle);
            }

            $.each(currentRectangles, function(index) {
                var rectangle = this;
                // calculate time until next render 
                var timeout;
                if (rectangle.A2) {
                    timeout = self.settings.timeoutA2;
                } else if(rectangle.bitDepth == 1) {
                    timeout = self.settings.timeout1bit;
                } else {
                    timeout = self.settings.timeout4bit;
                }
                if (timeout > nextCallTimeout) {
                    nextCallTimeout = timeout;
                }

                koalaRectangles.push(rectangle.left);
                koalaRectangles.push(rectangle.top);
                koalaRectangles.push(rectangle.width);
                koalaRectangles.push(rectangle.height);

                if (self.settings.newRectangleFormat) {
                    koalaRectangles.push(rectangle.inverse << 6 | rectangle.A2 << 4 | rectangle.bitDepth);
                    koalaRectangles.push(rectangle.dithering);
                } else {
                    A2 |= rectangle.A2;
                    inverse |= rectangle.inverse;
                    bitDepth = Math.max(bitDepth, rectangle.bitDepth);
                    dithering = Math.max(dithering, rectangle.dithering);
                }

                if (self.settings.debug) {
                    $('<div class="tmRectangle"></div>').css({
                        position: 'absolute',
                        width: rectangle.width,
                        height: rectangle.height,
                        top: rectangle.top-2,
                        left: rectangle.left-2,
                        'background-color': rectangle.bitDepth == 4 ? 'red' : 'blue',
                        opacity: 0.4
                    }).appendTo('#tmOverlay');
                }
                
                self.rectangles.splice(self.rectangles.indexOf(rectangle), 1);
            });

            if(koalaRectangles.length > 0) {
                if (this.settings.newRectangleFormat) {
                    okular.KoalaRenderRectangles(koalaRectangles.length, koalaRectangles);
                    if (this.settings.debug) {
                        var message = "Sending " + koalaRectangles.length/6 + " changes to koala. [";
                        $.each(koalaRectangles, function(i) {
                            value = this;
                            if (i%6 == 4) {
                                message += "0x" + value.toString(16) + " (Bit depth: " + (value & 0xf) + ", A2: " + ((value & 0x10) == 0x10) + ", Inverse: " + ((value & 0x40) == 0x40) + "), ";
                            } else if (i%6 == 5) {
                                message += value + " (Dithering: " + self.getDitheringName(value) + ")" + (koalaRectangles.length-1 == i ? "]" : "; ");
                            } else {
                                message += value + ", ";
                            }
                        });
                        console.log(message);
                    }
                } else {
                    if (A2) {
                        okular.KoalaUseA2Waveform();
                    }
                    if (inverse) {
                       okular.KoalaInverseNextRender();
                    }
                    okular.KoalaRender(koalaRectangles.length, koalaRectangles, bitDepth, dithering);
                    if (this.settings.debug) {
                        var message = "Sending " + koalaRectangles.length/4 + " changes to koala.";
                        message += " Bit depth: " + bitDepth;
                        message += ", A2: " + (A2==true);
                        message += ", Inverse: " + (inverse==true);
                        message += ", Dithering: " + this.getDitheringName(dithering);
                        message += ", Rectangles: [" + koalaRectangles.join(', ') + "]";
                        console.log(message);
                    }
                }
            }

            if (this.rectangles.length > 0) {
                if (nextCallTimeout == this.settings.timeoutFirsts) {
                    min = Math.min.apply(null, $.map(this.rectangles, function(rectangle) {
                        return rectangle.renderDelay - (now-rectangle.timestamp);
                    }));
                    if (min > nextCallTimeout) {
                        nextCallTimeout = min;
                    }
                }
                setTimeout($.proxy(this.sendToKoala, this), nextCallTimeout);
            }

            this.nextUpdate = new Date();
            this.nextUpdate.setMilliseconds(this.nextUpdate.getMilliseconds() + nextCallTimeout);

            if (okular.noChangeTimer) {
                clearTimeout(okular.noChangeTimer);
                okular.noChangeTimer = null;
            }
        },

        getDitheringName: function(value) {
            for(var prop in okular.dithering) {
                if(okular.dithering.hasOwnProperty(prop)) {
                    if(okular.dithering[prop] == value) {
                        return prop;
                    }
                }
            }
            return 'ERROR: invalid!';
        }
    });

    okular.dithering = {
        default: 0,
        none: 1,
        Bayer: 2,
        FloydSteinberg: 3
    };

    okular.defaults = {
        width: 600,
        height: 800,
        debug: true,
        debugOffset: 10,
        position: 'right',
        newRectangleFormat: false,
        combineRectangles: true,

        bitDepth: 4,
        dithering: okular.dithering.default,
        renderDelay: 0,
        timeoutFirst: 10,
        timeoutA2: 205,
        timeout1bit: 250,
        timeout4bit: 750,
        timeoutClick: 50
    };

    okular.defaultRectangleOptions = {
        combine: okular.defaults.combineRectangles,
        bitDepth: okular.defaults.bitDepth,
        A2: false,
        inverse: false,
        dithering: okular.defaults.dithering,
        renderDelay: okular.defaults.renderDelay,
        top: 0,
        left: 0
    };


    $.fn.tmList = function(options) {
        var rectangle = options || {},
            inset = rectangle.inset || 0;

        $(this).each(function() {
            var $this = $(this);
            if ($this.is(':visible')) {
                rectangle.width = $this.outerWidth() - inset * 2;
                rectangle.height = $this.outerHeight() - inset * 2;
                rectangle.left = $this.offset().left + inset;
                rectangle.top = $this.offset().top + inset;

                //check if the object is really visible (ie not under another via z-index)
                var realElement=$(document.elementFromPoint(rectangle.left, rectangle.top))[0];
                if($this[0]==realElement || $this.has($(realElement))) {
                    okular.add(rectangle);
                }
            }
        });
    }

    $('body').click(function() {
        if (okular.settings.timeoutClick > 0) {
            okular.noChangeTimer = setTimeout(function() {
                if (okular.rectangles.length == 0) {
                    okular.KoalaNochange();
                }
                okular.noChangeTimer = null;
            }, okular.settings.timeoutClick);
        }
    });

    //backward compatibility
    $.tmListEmpty = function() { 
        console.log("$.tmListRender is DEPRECATED, you don't need to use it anymore.");
    }
    $.tmListRender = function() {
        console.log("$.tmListRender is DEPRECATED, you don't need to use it anymore.");
    }
    $.tmList = function(options) {
        okular.add(options);
        console.log("$.tmList is DEPRECATED, use okular.add instead.");
    }
    $.tmListAddCoords = function(top, left, height, width, bitDepth) {
        okular.add({
            top: top,
            left: left,
            height: height,
            width: width,
            bitDepth: bitDepth
        });
        console.log("$.tmListAddCoords is DEPRECATED, use okular.add instead.");
    }
    $.fn.tmListBD = function (bit_depth, inset) {
        $(this).tmList({
            bitDepth: bit_depth,
            inset: inset
        });
        console.log("$.tmListBD is DEPRECATED, use tmList instead.");
    }

    $(document).ready(function() {
        if (!okular.settings) {
            okular.init();
        }
    });
 
})(jQuery, window, document);
