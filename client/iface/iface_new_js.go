package iface

import (
	"github.com/shippin/wardenclyffe/client/iface/bind"
	"github.com/shippin/wardenclyffe/client/iface/device"
	"github.com/shippin/wardenclyffe/client/iface/netstack"
	"github.com/shippin/wardenclyffe/client/iface/wgproxy"
)

// NewWGIFace creates a new WireGuard interface for WASM (always uses netstack mode)
func NewWGIFace(opts WGIFaceOpts) (*WGIface, error) {
	relayBind := bind.NewRelayBindJS()

	wgIface := &WGIface{
		tun:            device.NewNetstackDevice(opts.IFaceName, opts.Address, opts.WGPort, opts.WGPrivKey, opts.MTU, relayBind, netstack.ListenAddr()),
		userspaceBind:  true,
		wgProxyFactory: wgproxy.NewUSPFactory(relayBind, opts.MTU),
	}

	return wgIface, nil
}
