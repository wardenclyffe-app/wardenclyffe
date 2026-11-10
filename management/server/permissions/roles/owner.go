package roles

import (
	"github.com/shippin/wardenclyffe/management/server/permissions/operations"
	"github.com/shippin/wardenclyffe/management/server/types"
)

var Owner = RolePermissions{
	Role: types.UserRoleOwner,
	AutoAllowNew: map[operations.Operation]bool{
		operations.Read:   true,
		operations.Create: true,
		operations.Update: true,
		operations.Delete: true,
	},
}
