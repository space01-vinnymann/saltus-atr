import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client/react'
import { client } from './graphql/client'
import { QuestionnaireProvider } from './context/QuestionnaireContext'
import { useIframeHeight } from './hooks/useIframeHeight'
import { Layout } from './components/Layout'
import QuestionnaireStart from './pages/QuestionnaireStart'
import Questionnaire from './pages/Questionnaire'
import Results from './pages/Results'
import ErrorPage from './pages/Error'

function AppContent() {
  useIframeHeight()

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<QuestionnaireStart />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/results" element={<Results />} />
        <Route path="/error" element={<ErrorPage />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <ApolloProvider client={client}>
      <QuestionnaireProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QuestionnaireProvider>
    </ApolloProvider>
  )
}

export default App
