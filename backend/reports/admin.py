from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("id", "description", "amount", "spent_at", "clinic", "branch")
    list_filter = ("clinic", "branch", "spent_at")
    search_fields = ("description", "category")
