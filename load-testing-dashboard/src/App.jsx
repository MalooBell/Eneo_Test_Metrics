import React, { useState, useEffect } from 'react';
import Layout from './components/Layout/Layout';
import TestForm from './components/TestForm/TestForm';
import TestMetrics from './components/TestMetrics/TestMetrics';
import TestHistory from './components/TestHistory/TestHistory';
import Monitoring from './components/Monitoring/Monitoring';
import Visualization from './components/Visualization/Visualization';
import TestSummaryModal from './components/Common/TestSummaryModal';
import { testService } from './services/api';
import { useWebSocket, useWebSocketConnection } from './hooks/useWebSocket';

function App() {
  const [currentTab, setCurrentTab] = useState('new-test');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [testStats, setTestStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour la capture des métriques de début et fin
  const [initialTestStats, setInitialTestStats] = useState(null);
  const [finalTestStats, setFinalTestStats] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [testStartTime, setTestStartTime] = useState(null);

  // Connexion WebSocket
  useWebSocketConnection();

  // Écouter les événements WebSocket
  useWebSocket('test_started', (data) => {
    setIsTestRunning(true);
    setCurrentTest({ id: data.testId, name: data.name });
    // Réinitialiser les états pour le nouveau test
    setInitialTestStats(null);
    setFinalTestStats(null);
    setTestStartTime(new Date());
  });

  useWebSocket('test_stopped', () => {
    // Capturer les métriques finales avant de réinitialiser
    if (testStats) {
      setFinalTestStats(testStats);
    }
    
    setIsTestRunning(false);
    setShowSummaryModal(true);
  });

  useWebSocket('test_completed', () => {
    // Capturer les métriques finales avant de réinitialiser
    if (testStats) {
      setFinalTestStats(testStats);
    }
    
    setIsTestRunning(false);
    setShowSummaryModal(true);
  });

  useWebSocket('stats_update', (data) => {
    // Capturer les premières métriques reçues pour ce test
    if (!initialTestStats && data.stats && data.stats.stats && isTestRunning) {
      const aggregated = data.stats.stats.find(s => s.name === 'Aggregated');
      if (aggregated && aggregated.num_requests > 0) {
        console.log('Capturing initial test stats:', data.stats);
        setInitialTestStats(data.stats);
      }
    }
    
    // Toujours mettre à jour les stats courantes
    setTestStats(data.stats);
  });

  // Charger le statut initial
  useEffect(() => {
    loadCurrentTestStatus();
  }, []);

  const loadCurrentTestStatus = async () => {
    try {
      const status = await testService.getCurrentTest();
      setIsTestRunning(status.running);
      
      if (status.running) {
        setCurrentTest({ id: status.testId });
        setTestStats(status.stats);
      }
    } catch (error) {
      console.error('Erreur chargement statut:', error);
    }
  };

  // Fonction pour fermer le modal et réinitialiser les états
  const handleCloseSummaryModal = () => {
    console.log('Closing summary modal and resetting states');
    setShowSummaryModal(false);
    setCurrentTest(null);
    setTestStats(null);
    setInitialTestStats(null);
    setFinalTestStats(null);
    setTestStartTime(null);
  };

  const handleStartTest = async (testConfig) => {
    try {
      setIsLoading(true);
      const result = await testService.startTest(testConfig);
      
      if (result.success) {
        setIsTestRunning(true);
        setCurrentTest({ id: result.testId, name: testConfig.name });
      }
    } catch (error) {
      console.error('Erreur démarrage test:', error);
      alert('Erreur lors du démarrage du test. Vérifiez que le backend est démarré.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTest = async () => {
    try {
      setIsLoading(true);
      await testService.stopTest();
      
      setIsTestRunning(false);
      setCurrentTest(null);
      setTestStats(null);
    } catch (error) {
      console.error('Erreur arrêt test:', error);
      alert('Erreur lors de l\'arrêt du test.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 'new-test':
        return (
          <div className="space-y-8">
            <TestForm
              onStartTest={handleStartTest}
              onStopTest={handleStopTest}
              isTestRunning={isTestRunning}
              isLoading={isLoading}
              currentTest={currentTest}
            />
            
            {isTestRunning && (
              <TestMetrics 
                stats={testStats} 
                loading={!testStats}
              />
            )}
          </div>
        );
      
      case 'monitoring':
        return <Monitoring />;
      
      case 'visualization':
        return <Visualization />;
      
      case 'history':
        return (
          <TestHistory 
            onNavigateToVisualization={() => setCurrentTab('visualization')}
            isTestRunning={isTestRunning}
          />
        );
      
      default:
        return <div>Onglet non trouvé</div>;
    }
  };

  return (
    <Layout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      isTestRunning={isTestRunning}
    >
      {renderCurrentTab()}
      
      {/* Modal de résumé de test */}
      <TestSummaryModal
        isOpen={showSummaryModal}
        onClose={handleCloseSummaryModal}
        initialStats={initialTestStats}
        finalStats={finalTestStats}
        testName={currentTest?.name}
        testStartTime={testStartTime}
      />
    </Layout>
  );
}

export default App;