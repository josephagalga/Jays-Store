from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsBuyer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'buyer'


class IsSeller(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'seller'


class IsDriver(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'driver' and
            request.user.is_verified
        )


class IsAdminOrSeller(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ['admin', 'seller']
        )


class IsProductOwner(BasePermission):
    """
    Object-level: admins can edit any product,
    sellers can only edit their own.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return obj.seller == request.user