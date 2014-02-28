#!/bin/bash

export OS_USERNAME=admin
export OS_PASSWORD=stack
export OS_TENANT_NAME=admin
export OS_AUTH_URL=http://192.168.254.132:35357/v2.0
export PATH=$PATH:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games

function getInstances {
	nova list | grep -i active | awk -F '|' '{print $3}' | sed 's/^[ \t]*//g' 
}

#param: $1 the instance name
function getNics {
	if which quantum &> /dev/null; then
		PORTLIST=$(quantum port-list)
	else
		PORTLIST=$(neutron port-list)
	fi
	IFID=0
	echo "$PORTLIST" | grep $1 | while read LINE
	do
		IFID=$(expr $IFID + 1)
		VNIC=$(echo "$LINE" | awk -F '|' '{print $4}' | sed 's/^[ \t]*//g' | sed 's/[ \t]*$//g') 
		ADDR=$(echo "$LINE" | awk -F '|' '{print $5}' | awk -F ':' '{print $3}' | awk -F '}' '{print $1}' | awk -F '"' '{print $2}')
		echo "				{id:\"$1-$IFID\",name:\"eth?\",mac:\"$VNIC\",ip:\"$ADDR\"},"
	done
}

#param: $1 the instance name
function getTap {
	if which quantum &> /dev/null; then
		PORTLIST=$(quantum port-list | grep $1)
        else
                PORTLIST=$(neutron port-list | grep $1)
        fi
	IFID=0
	echo "$PORTLIST" | while read LINE
	do
		IFID=$(expr $IFID + 1)
		IDENTIFY=$(echo "$LINE" | awk -F '|' '{print $2}' | awk -F '-' '{print $1}')
		TAP=$(ifconfig | grep tap | grep $IDENTIFY | awk '{print $1}')
		if [ ! -z $TAP ]; then
			echo "		[\"$1-$IFID\",\"$TAP\"],"
		fi
	done
	
}

#param: $1 the physical eth interface name
function getIP {
	RES=$(ifconfig $1 | grep 'inet addr')
	if [ ! -z "$RES" ]; then
	 	echo "$RES" | awk '{print $2}' | awk -F ':' '{print $2}'
	fi
}

function getEthDetail {
        ifconfig | grep ^eth | awk '{print $1}' | while read LINE
        do
                echo "		{id:\"__$LINE\",name:\"$LINE\",ip:\"$(getIP $LINE)\"},"
        done
}

function getEth {
        ifconfig | grep ^eth | awk '{print $1}' | while read LINE
        do
                echo "$LINE"
        done
}

function getL2Devices {
	brctl show | cut -f 1 | grep -v 'bridge name' | sed '/^$/d' | grep -v virbr
}

function getIfconfig {
	ifconfig | grep "Link encap" | awk '{print $1}' | grep -v virbr | grep -v lo
}

function getSwitches {
	ovs-vsctl show | grep Bridge | awk '{print $2}' | tr -d "\""
}

function getTaggedInterfaces {
	OVSINFO=$(ovs-vsctl show)
	if [ -e /tmp/tags ]; then
		sudo rm -f /tmp/tags
	else
		touch /tmp/tags
	fi
	echo 0 > /tmp/flag
	echo "$OVSINFO" | while read LINE
	do
		if echo $LINE | grep tag &> /dev/null; then
			TAG=$(echo $LINE | awk -F ':' '{print $2}' | sed 's/^[ \t]*//g')
			echo 1 > /tmp/flag
		else
			FLAG=$(cat /tmp/flag)
			if [ $FLAG -eq 1 ]; then
				IF=$(echo $LINE | awk '{print $2}' | tr -d "\"")
				echo "$IF;$TAG"
				echo "$IF;$TAG" >> /tmp/tags
			fi
			echo 0 > /tmp/flag
		fi
	done
	sudo rm -f /tmp/flag
}

#param: $1 interface name
function getInterfaceTag {
	if [ ! -e /tmp/tags ]; then
		getTaggedInterfaces &> /dev/null
	fi
	cat /tmp/tags | grep $1 | awk -F ';' '{print $2}'
}

#common function
#param: $1 the first set; $2 the second set
function minus {
	echo "$1" | while read FSLINE
	do
		echo 0 > /tmp/flag
		echo "$2" | while read SSLINE
		do
			if [[ $FSLINE == $SSLINE ]]; then
				echo 1 > /tmp/flag
			fi
		done
		FLAG=$(cat /tmp/flag)
		if [ $FLAG -eq 0 ]; then
			echo $FSLINE
		fi
	done
	sudo rm -f /tmp/flag
}

function getBridges {
	DEVICES=$(getL2Devices)
	SWITCHES=$(getSwitches)
	minus "$DEVICES" "$SWITCHES"
}

function getVirDevices {
	DEVICES=$(getL2Devices)
	echo "$DEVICES"
	echo "$DEVICES" | while read DEVICE
	do
		getInterfaces $DEVICE
	done
}

function getPhyDevices {
	IFCONFIG=$(getIfconfig)
	VIRDEVICES=$(getVirDevices)
	minus "$IFCONFIG" "$VIRDEVICES"
}

function getVethPairs {
	if [ -e /tmp/pairs ]; then
		sudo rm -f /tmp/pairs
	else
		touch /tmp/pairs
	fi
	INTERFACES=$(getInterfaces br-int)
	IPLINKLIST=$(ip link list)
	echo "$INTERFACES" | while read IF
	do
		PAIRID=$(sudo ethtool -S $IF | grep peer | awk -F ':' '{print $2}' | sed 's/^[ \t]*//g')
		PAIR=$(echo "$IPLINKLIST" | grep ^$PAIRID: | awk -F ':' '{print $2}' | sed 's/^[ \t]*//g')
		if [ ! -z $PAIR ]; then
			echo "		[\"$IF\",\"$PAIR\"],"
			echo "$IF;$PAIR" >> /tmp/pairs
		fi
	done
}

function getPair {
	if [ ! -e /tmp/pairs ]; then
		getVethPairs &> /dev/null
	fi
	cat /tmp/pairs | grep $1 | awk -F ';' '{print $2}'	
}

#param: BR name
function getInterfaces {
	POS=0
	brctl show $1 | grep -v interfaces | while read LINE
	do
		POS=$(expr $POS + 1)
		if [ $POS -eq 1 ]; then
			echo $LINE | awk '{print $4}' | sed '/^$/d'
		else
			echo $LINE
		fi
	done			
}

function getPhyLinks {
	PHY=$(getPhyDevices)
	ETH=$(getEth)
	ITEMS=$(minus "$ETH" "$PHY")
	echo "$ITEMS" | while read LINE
	do
		if [ ! -z $LINE]; then
			echo "		[\"__$LINE\",\"$LINE\"],"
		fi
	done
}
