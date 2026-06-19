# Contributing Guide

Thank you for picking up this project! This document explains how the codebase is structured and how to add new features cleanly.

---

## Development Workflow

### Branch Strategy

```
main          ← Stable, production-ready code
develop       ← Integration branch for completed features
feature/*     ← Individual feature branches
fix/*         ← Bug fix branches
docs/*        ← Documentation-only changes
```

**Example:**
```bash
git checkout -b feature/performance-reviews
```

### Commit Message Convention

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

Examples:
feat(payroll): add bulk payroll generation endpoint
fix(attendance): resolve GPS fallback timeout issue
docs(readme): update setup instructions
refactor(employee): extract role resolution to utility function
test(leave): add unit tests for approval guard
```

---

## Adding a New Backend Feature

### Step 1 — Define the Model

Create or update a model file in `backend/employees/models/`:

```python
# backend/employees/models/performance.py
from django.db import models
from .employee import BaseModel, Employee

class PerformanceReview(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    review_date = models.DateField()
    rating = models.IntegerField()        # 1–5
    feedback = models.TextField(blank=True)

    class Meta:
        db_table = 'performance_review'
```

Export it in `backend/employees/models/__init__.py`:
```python
from .performance import PerformanceReview
```

### Step 2 — Create Migration

```bash
cd backend
python manage.py makemigrations employees
python manage.py migrate
```

### Step 3 — Write the Serializer

```python
# backend/employees/serializers/performance.py
from rest_framework import serializers
from employees.models import PerformanceReview

class PerformanceReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceReview
        fields = '__all__'
```

Export in `backend/employees/serializers/__init__.py`.

### Step 4 — Write the ViewSet

```python
# backend/employees/views/performance.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from employees.models import PerformanceReview
from employees.serializers import PerformanceReviewSerializer

class PerformanceReviewViewSet(viewsets.ModelViewSet):
    queryset = PerformanceReview.objects.all()
    serializer_class = PerformanceReviewSerializer
    permission_classes = [IsAuthenticated]
```

Export in `backend/employees/views/__init__.py`.

### Step 5 — Register URL Route

In `backend/employees/urls.py`:
```python
router.register(r'performance/reviews', PerformanceReviewViewSet)
```

---

## Adding a New Frontend Page

### Step 1 — Create the Page Component

```bash
mkdir frontend/src/pages/performance
touch frontend/src/pages/performance/page.tsx
```

### Step 2 — Create the Service

```typescript
// frontend/src/services/performanceService.ts
import api from '@/lib/api';

export const performanceService = {
  getAll: async () => {
    const res = await api.get('/performance/reviews/');
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/performance/reviews/', data);
    return res.data;
  },
};
```

### Step 3 — Register the Route

In `frontend/src/App.tsx`:
```typescript
const PerformancePage = lazy(() => import('./pages/performance/page'));

// Inside <Routes>:
<Route path="/performance" element={<PerformancePage />} />
```

### Step 4 — Add to Sidebar

In `frontend/src/components/layout/Sidebar.tsx`, add a nav item to the nav items array.

---

## Role Permission Reference

Use the `get_user_role(user)` helper from `backend/employees/utils.py` in all ViewSets:

```python
from employees.utils import get_user_role

role = get_user_role(request.user)
if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
    raise PermissionDenied("Insufficient permissions.")
```

---

## Running the Test Suite

```bash
cd backend
python manage.py test
```

---

## Linting & Type Checks

**Frontend:**
```bash
cd frontend
npm run build     # TypeScript type-check + Vite bundle
```

**Backend:**
```bash
cd backend
python manage.py check    # Django system checks
```

---

## Key Files Reference

| File | Purpose |
|---|---|
| `backend/core/settings.py` | Global Django config (JWT, CORS, email, DB) |
| `backend/employees/utils.py` | `get_user_role()` — the RBAC resolver |
| `backend/employees/urls.py` | All API route registrations |
| `backend/employees/signals/handlers.py` | Auto-triggered logic (emails, notifications) |
| `frontend/src/lib/api.ts` | Axios instance with JWT header injection |
| `frontend/src/context/AuthContext.tsx` | Global user session state |
| `frontend/src/App.tsx` | Client-side route declarations |
