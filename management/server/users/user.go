package users

import (
	"github.com/shippin/wardenclyffe/management/server/permissions/roles"
	"github.com/shippin/wardenclyffe/management/server/types"
)

// Wrapped UserInfo with Role Permissions
type UserInfoWithPermissions struct {
	*types.UserInfo

	Permissions roles.Permissions
	Restricted  bool
}
