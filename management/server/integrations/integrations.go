package integrations

import (
	"context"

	"github.com/shippin/wardenclyffe/management/server/activity"
	"github.com/shippin/wardenclyffe/management/server/integrations/extra_settings"
	"github.com/shippin/wardenclyffe/management/server/integrations/port_forwarding"
	"github.com/shippin/wardenclyffe/management/server/peer"
	"github.com/shippin/wardenclyffe/management/server/store"
	"github.com/shippin/wardenclyffe/management/server/types"
)

type managerImpl struct{}

// NewManager returns the default extra-settings manager implementation.
func NewManager(_ activity.Store) extra_settings.Manager {
	return &managerImpl{}
}

func (m *managerImpl) GetExtraSettings(context.Context, string) (*types.ExtraSettings, error) {
	return &types.ExtraSettings{}, nil
}

func (m *managerImpl) UpdateExtraSettings(context.Context, string, string, *types.ExtraSettings) (bool, error) {
	return false, nil
}

type controllerImpl struct {
	store store.Store
}

// NewController returns the default port-forwarding controller implementation.
func NewController(store store.Store) port_forwarding.Controller {
	return &controllerImpl{store: store}
}

func (c *controllerImpl) SendUpdate(context.Context, string, string, []string, map[string]*peer.Peer) {
}

func (c *controllerImpl) GetProxyNetworkMaps(context.Context, string, string, map[string]*peer.Peer) (map[string]*types.NetworkMap, error) {
	return make(map[string]*types.NetworkMap), nil
}

func (c *controllerImpl) GetProxyNetworkMapsAll(context.Context, string, map[string]*peer.Peer) (map[string]*types.NetworkMap, error) {
	return make(map[string]*types.NetworkMap), nil
}

func (c *controllerImpl) IsPeerInIngressPorts(context.Context, string, string) (bool, error) {
	return false, nil
}
