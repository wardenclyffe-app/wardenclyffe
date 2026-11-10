//go:build ios

package iface

import (
	"github.com/shippin/wardenclyffe/client/iface/bind"
	"github.com/shippin/wardenclyffe/client/iface/device"
	"github.com/shippin/wardenclyffe/client/iface/wgproxy"
)

// NewWGIFace Creates a new WireGuard interface instance
func NewWGIFace(opts WGIFaceOpts) (*WGIface, error) {
	iceBind := bind.NewICEBind(opts.TransportNet, opts.Address, opts.MTU)

	wgIFace := &WGIface{
		tun:            device.NewTunDevice(opts.IFaceName, opts.Address, opts.WGPort, opts.WGPrivKey, opts.MTU, iceBind, opts.MobileArgs.TunFd),
		userspaceBind:  true,
		wgProxyFactory: wgproxy.NewUSPFactory(iceBind, opts.MTU),
	}
	return wgIFace, nil
}
