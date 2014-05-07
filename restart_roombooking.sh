#!/bin/bash
# Used to start supervisor daemon which then deamonizes roombooking

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
virt/bin/supervisorctl restart roombooking
