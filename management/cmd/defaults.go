package cmd

const (
	defaultMgmtDataDir   = "/var/lib/wardenclyffe/"
	defaultMgmtConfigDir = "/etc/wardenclyffe"
	defaultLogDir        = "/var/log/wardenclyffe"

	oldDefaultMgmtDataDir   = "/var/lib/wiretrustee/"
	oldDefaultMgmtConfigDir = "/etc/wiretrustee"
	oldDefaultLogDir        = "/var/log/wiretrustee"

	defaultMgmtConfig    = defaultMgmtConfigDir + "/management.json"
	defaultLogFile       = defaultLogDir + "/management.log"
	oldDefaultMgmtConfig = oldDefaultMgmtConfigDir + "/management.json"
	oldDefaultLogFile    = oldDefaultLogDir + "/management.log"

	defaultSingleAccModeDomain = "wardenclyffe.selfhosted"
)
