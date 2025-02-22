

from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('lessons', views.lesson_list, name='lesson_list'),
    path('lesson/<int:lesson_id>/', views.learn, name='learn'),
    path("api/run_code/<int:lesson_id>/", views.run_code, name="run_code"),  # ✅ Pass `lesson_id` dynamically
]
