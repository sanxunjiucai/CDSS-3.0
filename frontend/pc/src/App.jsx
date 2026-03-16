import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { PCLayout }             from './components/layout/PCLayout'
import { LoginPage }            from './pages/LoginPage'
import { HomePage }             from './pages/HomePage'
import { SearchPage }           from './pages/SearchPage'
import { DiseasesPage }         from './pages/DiseasesPage'
import { DiseaseDetailPage }    from './pages/DiseaseDetailPage'
import { DrugsPage }            from './pages/DrugsPage'
import { DrugDetailPage }       from './pages/DrugDetailPage'
import { ExamsPage }            from './pages/ExamsPage'
import { ExamDetailPage }       from './pages/ExamDetailPage'
import { GuidelinesPage }       from './pages/GuidelinesPage'
import { GuidelineDetailPage }  from './pages/GuidelineDetailPage'
import { LiteraturePage }       from './pages/LiteraturePage'
import { CasesPage }            from './pages/CasesPage'
import { LiteratureDetailPage } from './pages/LiteratureDetailPage'
import { CaseDetailPage }       from './pages/CaseDetailPage'
import { FormulasPage }         from './pages/FormulasPage'
import { AssessmentsPage }      from './pages/AssessmentsPage'
import { AssessmentDetailPage } from './pages/AssessmentDetailPage'
import { TreatmentsPage }       from './pages/TreatmentsPage'
import { useAuthStore }         from './stores/auth'

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
      {/* 登录页 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 主应用（需登录） */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <PCLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="search"                    element={<SearchPage />} />

        {/* 疾病知识库 */}
        <Route path="diseases"                  element={<DiseasesPage />} />
        <Route path="diseases/:id"              element={<DiseaseDetailPage />} />

        {/* 药品库 */}
        <Route path="drugs"                     element={<DrugsPage />} />
        <Route path="drugs/:id"                 element={<DrugDetailPage />} />

        {/* 检验检查知识库 */}
        <Route path="exams"                     element={<ExamsPage />} />
        <Route path="exams/:id"                 element={<ExamDetailPage />} />

        {/* 临床指南库 */}
        <Route path="guidelines"               element={<GuidelinesPage />} />
        <Route path="guidelines/:id"           element={<GuidelineDetailPage />} />

        {/* 文献知识库 */}
        <Route path="literature"               element={<LiteraturePage />} />
        <Route path="literature/:id"           element={<LiteratureDetailPage />} />
        <Route path="cases"                    element={<CasesPage />} />
        <Route path="cases/:id"                element={<CaseDetailPage />} />

        {/* 治疗方案 */}
        <Route path="treatments"               element={<TreatmentsPage />} />

        {/* 医学公式库 */}
        <Route path="formulas"                 element={<FormulasPage />} />

        {/* 评估量表 */}
        <Route path="assessments"              element={<AssessmentsPage />} />
        <Route path="assessments/:id"          element={<AssessmentDetailPage />} />

        {/* 兜底重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
