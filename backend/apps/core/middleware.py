from django.utils import timezone


class UpdateLastActiveMiddleware:
    """
    Automatically updates the last_active field on every
    authenticated request. This powers all the activity
    analytics on the admin dashboard.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only update for authenticated users
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Use update() instead of save() to avoid triggering
            # the full model save — much faster for every request
            type(request.user).objects.filter(pk=request.user.pk).update(
                last_active=timezone.now()
            )

        return response