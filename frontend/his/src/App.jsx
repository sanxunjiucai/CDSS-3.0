import { Routes, Route, Navigate } from 'react-router-dom'
import { HISLayout }       from './components/HISLayout'
import { MainPanel }       from './components/panels/MainPanel'
import { DiagnosisPanel }  from './components/panels/DiagnosisPanel'
import { LabResultPanel }  from './components/panels/LabResultPanel'
import { AssessmentPanel } from './components/panels/AssessmentPanel'
import { GuidelinePanel }  from './components/panels/GuidelinePanel'
import { DrugSearchPanel } from './components/panels/DrugSearchPanel'
import { KnowledgeDetail } from './components/KnowledgeDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HISLayout />}>
        <Route index element={<Navigate to="/main" replace />} />
        <Route path="main"            element={<MainPanel />} />
        <Route path="diagnosis"       element={<DiagnosisPanel />} />
        <Route path="lab-result"      element={<LabResultPanel />} />
        <Route path="assessment/:id"  element={<AssessmentPanel />} />
        <Route path="guidelines"      element={<GuidelinePanel />} />
        <Route path="drugs"           element={<DrugSearchPanel />} />
        <Route path="knowledge/:type/:id" element={<KnowledgeDetail />} />
      </Route>
    </Routes>
  )
}
