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

        # Only update for authenticated users.
        # NOTE: request.user is a SimpleLazyObject proxy, so never use
        # type(request.user) here — it returns SimpleLazyObject which has
        # no .objects manager and 500s every authenticated request.
        # Use get_user_model() instead, and never let analytics break
        # the request.
        try:
            user = getattr(request, 'user', None)
            if user is not None and user.is_authenticated:
                from django.contrib.auth import get_user_model
                get_user_model().objects.filter(pk=user.pk).update(
                    last_active=timezone.now()
                )
        except Exception:
            pass

        return response