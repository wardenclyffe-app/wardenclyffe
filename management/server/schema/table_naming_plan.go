package schema

type TableNamingPlanEntry struct {
	Domain       string
	CurrentTable string
	TargetTable  string
}

var tableNamingPlan = []TableNamingPlanEntry{
	{Domain: "core", CurrentTable: "accounts", TargetTable: "wardenclyffe_core_accounts"},
	{Domain: "core", CurrentTable: "extra_settings", TargetTable: "wardenclyffe_core_extra_settings"},
	{Domain: "core", CurrentTable: "group_peers", TargetTable: "wardenclyffe_core_group_peers"},
	{Domain: "core", CurrentTable: "groups", TargetTable: "wardenclyffe_core_groups"},
	{Domain: "core", CurrentTable: "installations", TargetTable: "wardenclyffe_core_installations"},
	{Domain: "core", CurrentTable: "jobs", TargetTable: "wardenclyffe_core_jobs"},
	{Domain: "core", CurrentTable: "peers", TargetTable: "wardenclyffe_core_peers"},
	{Domain: "core", CurrentTable: "personal_access_tokens", TargetTable: "wardenclyffe_core_personal_access_tokens"},
	{Domain: "core", CurrentTable: "policies", TargetTable: "wardenclyffe_core_policies"},
	{Domain: "core", CurrentTable: "policy_rules", TargetTable: "wardenclyffe_core_policy_rules"},
	{Domain: "core", CurrentTable: "proxy_access_tokens", TargetTable: "wardenclyffe_core_proxy_access_tokens"},
	{Domain: "core", CurrentTable: "routes", TargetTable: "wardenclyffe_core_routes"},
	{Domain: "core", CurrentTable: "setup_keys", TargetTable: "wardenclyffe_core_setup_keys"},
	{Domain: "core", CurrentTable: "users", TargetTable: "wardenclyffe_core_users"},
	{Domain: "core", CurrentTable: "ui_events", TargetTable: "wardenclyffe_core_ui_events"},
	{Domain: "profile", CurrentTable: "account_onboardings", TargetTable: "wardenclyffe_profile_account_onboardings"},
	{Domain: "profile", CurrentTable: "user_invites", TargetTable: "wardenclyffe_profile_user_invites"},
	{Domain: "network", CurrentTable: "network_addresses", TargetTable: "wardenclyffe_network_addresses"},
	{Domain: "network", CurrentTable: "network_resources", TargetTable: "wardenclyffe_network_resources"},
	{Domain: "network", CurrentTable: "network_routers", TargetTable: "wardenclyffe_network_routers"},
	{Domain: "network", CurrentTable: "networks", TargetTable: "wardenclyffe_networks"},
	{Domain: "dns", CurrentTable: "name_server_groups", TargetTable: "wardenclyffe_dns_name_server_groups"},
	{Domain: "dns", CurrentTable: "records", TargetTable: "wardenclyffe_dns_records"},
	{Domain: "dns", CurrentTable: "zones", TargetTable: "wardenclyffe_dns_zones"},
	{Domain: "posture", CurrentTable: "posture_checks", TargetTable: "wardenclyffe_posture_checks"},
	{Domain: "proxy", CurrentTable: "access_log_entries", TargetTable: "wardenclyffe_proxy_access_log_entries"},
	{Domain: "proxy", CurrentTable: "domains", TargetTable: "wardenclyffe_proxy_domains"},
	{Domain: "proxy", CurrentTable: "proxies", TargetTable: "wardenclyffe_proxy_proxies"},
	{Domain: "proxy", CurrentTable: "services", TargetTable: "wardenclyffe_proxy_services"},
	{Domain: "proxy", CurrentTable: "targets", TargetTable: "wardenclyffe_proxy_targets"},
	{Domain: "agent_network", CurrentTable: "agent_network_access_log", TargetTable: "wardenclyffe_agent_network_access_log"},
	{Domain: "agent_network", CurrentTable: "agent_network_access_log_group", TargetTable: "wardenclyffe_agent_network_access_log_group"},
	{Domain: "agent_network", CurrentTable: "agent_network_budget_rules", TargetTable: "wardenclyffe_agent_network_budget_rules"},
	{Domain: "agent_network", CurrentTable: "agent_network_consumption", TargetTable: "wardenclyffe_agent_network_consumption"},
	{Domain: "agent_network", CurrentTable: "agent_network_guardrails", TargetTable: "wardenclyffe_agent_network_guardrails"},
	{Domain: "agent_network", CurrentTable: "agent_network_policies", TargetTable: "wardenclyffe_agent_network_policies"},
	{Domain: "agent_network", CurrentTable: "agent_network_providers", TargetTable: "wardenclyffe_agent_network_providers"},
	{Domain: "agent_network", CurrentTable: "agent_network_request_usage", TargetTable: "wardenclyffe_agent_network_request_usage"},
	{Domain: "agent_network", CurrentTable: "agent_network_request_usage_group", TargetTable: "wardenclyffe_agent_network_request_usage_group"},
	{Domain: "agent_network", CurrentTable: "agent_network_settings", TargetTable: "wardenclyffe_agent_network_settings"},
}

func TableNamingPlan() []TableNamingPlanEntry {
	out := make([]TableNamingPlanEntry, len(tableNamingPlan))
	copy(out, tableNamingPlan)
	return out
}
