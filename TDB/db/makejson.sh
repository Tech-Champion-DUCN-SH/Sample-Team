#!/bin/bash

function printHosts {
	/home/stack/day2/src/db/get host | while read LINE
	do
		echo "		{	name:\"$LINE\","
		echo "			interfaces:["
		echo "$(/home/stack/day2/src/db/get nic $LINE)"
		echo "			],"
		echo "		},"
	done
}

function printBridges {
	/home/stack/day2/src/db/get br | while read LINE
	do
		echo "		{	name:\"$LINE\","
		echo "                  	interfaces:["
		/home/stack/day2/src/db/get interface $LINE | while read IF
                do
                        echo "	                          {id:\"$IF\",name:\"$IF\",},"
                done
                echo "                  	],"
		echo "		},"
	done
}

function printSwitches {
	/home/stack/day2/src/db/get ovs | while read LINE
	do
		echo "		{	name:\"$LINE\","
		echo "			interfaces:["
		/home/stack/day2/src/db/get interface $LINE | while read IF
		do
			echo "				{id:\"$IF\",name:\"$IF\",vlans:[$(/home/stack/day2/src/db/get tag $IF)],},"
		done
		echo "			],"
		echo "		},"
	done
}

function printLinks {
	/home/stack/day2/src/db/get host | while read LINE	
	do
		/home/stack/day2/src/db/get tap $LINE	
	done
	/home/stack/day2/src/db/get pairs
	/home/stack/day2/src/db/get links
}

echo "\
var data=
{
	name:\"$(/sbin/ifconfig eth0 | grep 'inet addr' | awk '{print $2}' | awk -F ':' '{print $2}')\",
	interfaces:[
$(/home/stack/day2/src/db/get ethdetail)
	],
	vms:[
$(printHosts)
	],

	bridges:[
$(printBridges)
	],

	switches:[
$(printSwitches)
	],

	links: [
$(printLinks)
	],
}"
