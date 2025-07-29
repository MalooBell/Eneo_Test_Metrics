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
  
  // États pour le résumé de test
  const [testSummary, setTestSummary] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [firstMetrics, setFirstMetrics] = useState(null);

  // Connexion WebSocket
  useWebSocketConnection();

  // Écouter les événements WebSocket
  useWebSocket('test_started', (data) => {
    setIsTestRunning(true);
    setCurrentTest({ id: data.testId, name: data.name });
    setFirstMetrics(null); // Réinitialiser pour le nouveau test
  });

  useWebSocket('test_stopped', (data) => {
    setIsTestRunning(false);
    
    // Créer le résumé du test
    if (currentTest && testStats) {
      createTestSummary('stopped');
    }
    
    setCurrentTest(null);
    setTestStats(null);
    setFirstMetrics(null);
  });

  useWebSocket('test_completed', (data) => {
    setIsTestRunning(false);
    
    // Créer le résumé du test
    if (currentTest && testStats) {
      createTestSummary('completed');
    }
    
    setCurrentTest(null);
    setTestStats(null);
    setFirstMetrics(null);
  });

  useWebSocket('stats_update', (data) => {
    // Capturer les premières métriques reçues
    if (!firstMetrics && data.stats && data.stats.stats) {
      const aggregated = data.stats.stats.find(s => s.name === 'Aggregated');
      if (aggregated && aggregated.num_requests > 0) {
        setFirstMetrics({
          avgResponseTime: aggregated.avg_response_time,
          requestsPerSecond: aggregated.current_rps,
          errorRate: aggregated.num_requests > 0 ? (aggregated.num_failures / aggregated.num_requests) * 100 : 0,
          totalRequests: aggregated.num_requests,
          totalFailures: aggregated.num_failures,
          timestamp: new Date()
        });
      }
    }
    
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

  // Fonction pour créer le résumé du test
  const createTestSummary = (finalStatus) => {
    if (!currentTest || !testStats || !firstMetrics) return;

    const aggregated = testStats.stats?.find(s => s.name === 'Aggregated');
    if (!aggregated) return;

    const endMetrics = {
      avgResponseTime: aggregated.avg_response_time,
      requestsPerSecond: aggregated.current_rps,
      errorRate: aggregated.num_requests > 0 ? (aggregated.num_failures / aggregated.num_requests) * 100 : 0,
      totalRequests: aggregated.num_requests,
      totalFailures: aggregated.num_failures,
      timestamp: new Date()
    };

    const duration = firstMetrics.timestamp && endMetrics.timestamp 
      ? Math.round((endMetrics.timestamp - firstMetrics.timestamp) / 1000)
      : 0;

    const summary = {
      testName: currentTest.name,
      testId: currentTest.id,
      finalStatus,
      duration: duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : 'N/A',
      users: testStats.user_count || 0,
      startMetrics: firstMetrics,
      endMetrics,
      createdAt: new Date()
    };

    setTestSummary(summary);
    setShowSummaryModal(true);

    // TODO: Sauvegarder le résumé (sera implémenté côté backend plus tard)
    console.log('Résumé du test créé:', summary);
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
        onClose={() => setShowSummaryModal(false)}
        testSummary={testSummary}
      />
    </Layout>
  );
}

export default App;