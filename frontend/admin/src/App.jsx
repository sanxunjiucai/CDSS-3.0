import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AdminLayout }             from './components/layout/AdminLayout'
import { LoginPage }               from './pages/LoginPage'
import { DashboardPage }           from './pages/DashboardPage'
import { DiseasesAdminPage }       from './pages/DiseasesAdminPage'
import { DrugsAdminPage }          from './pages/DrugsAdminPage'
import { ExamsAdminPage }          from './pages/ExamsAdminPage'
import { GuidelinesAdminPage }     from './pages/GuidelinesAdminPage'
import { FormulasAdminPage }       from './pages/FormulasAdminPage'
import { AssessmentsAdminPage }    from './pages/AssessmentsAdminPage'
import { LiteratureAdminPage }     from './pages/LiteratureAdminPage'
import { AuditRulesAdminPage }     from './pages/AuditRulesAdminPage'
import { UsersAdminPage }          from './pages/UsersAdminPage'
import { ImportPage }              from './pages/ImportPage'
import { CategoriesAdminPage }     from './pages/CategoriesAdminPage'
import { SearchConfigPage }        from './pages/SearchConfigPage'
import { useAuthStore }            from './stores/auth'

function RequireAuth({ children }) {
  const { token } = useAuthStore()
  const location = useLocation()
  // 同时检查 Zustand store 和 localStorage，避免水合时序导致的误跳转
  const hasToken = token || localStorage.getItem('cdss_token')
  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="diseases"      element={<DiseasesAdminPage />} />
        <Route path="drugs"         element={<DrugsAdminPage />} />
        <Route path="exams"         element={<ExamsAdminPage />} />
        <Route path="guidelines"    element={<GuidelinesAdminPage />} />
        <Route path="literature"    element={<LiteratureAdminPage />} />
        <Route path="formulas"      element={<FormulasAdminPage />} />
        <Route path="assessments"   element={<AssessmentsAdminPage />} />
        <Route path="audit-rules"   element={<AuditRulesAdminPage />} />
        <Route path="categories"    element={<CategoriesAdminPage />} />
        <Route path="search-config" element={<SearchConfigPage />} />
        <Route path="import"        element={<ImportPage />} />
        <Route path="users"         element={<UsersAdminPage />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
