package legacynmap

import (
	types "github.com/shippin/wardenclyffe/management/server/types"
	sharedtypes "github.com/shippin/wardenclyffe/shared/management/types"
)

type (
	Account = types.Account

	DNSSettings       = types.DNSSettings
	FirewallRule      = sharedtypes.FirewallRule
	ForwardingRule    = sharedtypes.ForwardingRule
	Group             = types.Group
	Network           = types.Network
	Policy            = types.Policy
	PolicyRule        = types.PolicyRule
	Resource          = types.Resource
	RulePortRange     = sharedtypes.RulePortRange
	RouteFirewallRule = sharedtypes.RouteFirewallRule
)

const (
	FirewallRuleDirectionIN  = sharedtypes.FirewallRuleDirectionIN
	FirewallRuleDirectionOUT = sharedtypes.FirewallRuleDirectionOUT

	PolicyRuleProtocolALL        = sharedtypes.PolicyRuleProtocolALL
	PolicyRuleProtocolTCP        = sharedtypes.PolicyRuleProtocolTCP
	PolicyRuleProtocolWardenclyffeSSH = sharedtypes.PolicyRuleProtocolWardenclyffeSSH
	PolicyTrafficActionAccept    = sharedtypes.PolicyTrafficActionAccept
	ResourceTypePeer             = sharedtypes.ResourceTypePeer

	AllowedIPsFormat   = sharedtypes.AllowedIPsFormat
	AllowedIPsV6Format = sharedtypes.AllowedIPsV6Format
)
