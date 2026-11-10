package roles

import (
	"github.com/shippin/wardenclyffe/management/server/permissions/operations"
	"github.com/shippin/wardenclyffe/management/server/types"
)

var User = RolePermissions{
	Role: types.UserRoleUser,
	AutoAllowNew: map[operations.Operation]bool{
		operations.Read:   false,
		operations.Create: false,
		operations.Update: false,
		operations.Delete: false,
	},
}
