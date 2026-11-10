package config

import (
	"github.com/shippin/wardenclyffe/management/server/types"
	"github.com/shippin/wardenclyffe/shared/management/proto"
)

// ExtendWardenClyffeConfig extends config with integration-specific fields.
func ExtendWardenClyffeConfig(_ string, _ []string, config *proto.WardenclyffeConfig, _ *types.ExtraSettings) *proto.WardenclyffeConfig {
	return config
}
