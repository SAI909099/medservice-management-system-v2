from collections.abc import Iterable

PAGE_PERMISSIONS = [
    ("dashboard", "Boshqaruv paneli"),
    ("patients", "Bemorlar"),
    ("appointments", "Qabul va navbat"),
    ("service_queue", "Xizmat navbati"),
    ("mrt_queue", "MRT Navbati"),
    ("doctors", "Shifokorlar"),
    ("lab", "Laboratoriya"),
    ("treatment", "Davolash xonasi"),
    ("rooms", "Xonalar ro'yxati"),
    ("treatment_billing", "Yotoq to'lovlari"),
    ("cash_register", "Kassa"),
    ("billing", "To'lovlar"),
    ("pricing", "Xizmat narxlari"),
    ("accountant", "Buxgalteriya"),
    ("income", "Daromad analitika"),
    ("reports", "Hisobotlar"),
    ("settings_users", "Foydalanuvchilar va ruxsatlar"),
]

ALL_PAGE_CODES = {code for code, _ in PAGE_PERMISSIONS}

ROLE_DEFAULT_PAGES = {
    "super_admin": ALL_PAGE_CODES,
    "admin": ALL_PAGE_CODES,
    "registrator": {"dashboard", "patients", "appointments", "service_queue", "mrt_queue", "doctors", "treatment", "rooms", "reports"},
    "cashier": {"dashboard", "cash_register", "billing", "treatment_billing", "pricing", "reports", "patients", "income"},
    "doctor": {"dashboard", "doctors", "appointments", "service_queue", "mrt_queue", "patients", "lab", "reports"},
    "lab_staff": {"dashboard", "lab", "patients", "mrt_queue"},
    "treatment_staff": {"dashboard", "treatment", "rooms", "treatment_billing", "patients"},
}


def sanitize_page_codes(page_codes: Iterable[str]) -> set[str]:
    return {code for code in page_codes if code in ALL_PAGE_CODES}
