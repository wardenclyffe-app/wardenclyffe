package iface

import (
	"net"
	"net/netip"

	"golang.zx2c4.com/wireguard/tun/netstack"

	"github.com/shippin/wardenclyffe/client/iface/device"
	"github.com/shippin/wardenclyffe/client/iface/wgaddr"
)

type wgIfaceBase interface {
	AddAllowedIP(peerKey string, allowedIP netip.Prefix) error
	RemoveAllowedIP(peerKey string, allowedIP netip.Prefix) error

	Name() string
	Address() wgaddr.Address
	ToInterface() *net.Interface
	IsUserspaceBind() bool
	GetFilter() device.PacketFilter
	GetDevice() *device.FilteredDevice
	GetNet() *netstack.Net
}
