//go:build !android

package server

import (
	"github.com/shippin/wardenclyffe/client/firewall/iptables"
	"github.com/shippin/wardenclyffe/client/firewall/nftables"
	"github.com/shippin/wardenclyffe/client/internal/dns"
	"github.com/shippin/wardenclyffe/client/internal/routemanager/systemops"
	"github.com/shippin/wardenclyffe/client/internal/statemanager"
	"github.com/shippin/wardenclyffe/client/ssh/config"
)

// registerStates registers all states that need crash recovery cleanup.
func registerStates(mgr *statemanager.Manager) {
	mgr.RegisterState(&dns.ShutdownState{})
	mgr.RegisterState(&systemops.ShutdownState{})
	mgr.RegisterState(&nftables.ShutdownState{})
	mgr.RegisterState(&iptables.ShutdownState{})
	mgr.RegisterState(&config.ShutdownState{})
}
