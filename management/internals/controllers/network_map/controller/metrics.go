package controller

import (
	"github.com/shippin/wardenclyffe/management/server/telemetry"
)

type metrics struct {
	*telemetry.UpdateChannelMetrics
}

func newMetrics(updateChannelMetrics *telemetry.UpdateChannelMetrics) (*metrics, error) {
	return &metrics{
		updateChannelMetrics,
	}, nil
}
