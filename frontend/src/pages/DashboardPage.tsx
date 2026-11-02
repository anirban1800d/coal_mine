import { useState } from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import DomainSelector from '../components/DomainSelector';
import type { Domain } from '../components/DomainSelector';
import SearchBar from '../components/SearchBar';
import { searchCPCB, searchDGMS } from '../services/api';
import type { CPCBResponse, DGMSResponse } from '../services/api';
import { AnimatePresence } from 'framer-motion';
import { describeError } from '../lib/utils';

import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import ResultsList from '../components/ResultsList';
import PPEView from '../components/PPEView';
import { useAuth } from '../context/AuthContext';

const EXAMPLE_QUERIES: Record<'cpcb' | 'dgms', string[]> = {
  cpcb: ['ambient air quality monitoring', 'effluent discharge limits', 'hazardous waste storage'],
  dgms: ['self-rescuer requirement', 'ventilation survey frequency', 'roof support system'],
};

const PLACEHOLDERS: Record<'cpcb' | 'dgms', string> = {
  cpcb: 'Search CPCB environmental standards…',
  dgms: 'Search DGMS mining safety regulations…',
};

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const [domain, setDomain] = useState<Domain>('cpcb');
  const [query, setQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [cpcbResults, setCpcbResults] = useState<CPCBResponse | null>(null);
  const [dgmsResults, setDgmsResults] = useState<DGMSResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleDomainChange = (newDomain: Domain) => {
    setDomain(newDomain);
    setQuery('');
    setCpcbResults(null);
    setDgmsResults(null);
    setError(null);
    setErrorDetail(null);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    // PPE domain doesn't do text search
    if (!query.trim() || domain === 'ppe') return;

    setIsLoading(true);
    setError(null);
    setErrorDetail(null);
    setHasSearched(true);

    setCpcbResults(null);
    setDgmsResults(null);

    try {
      if (domain === 'cpcb') {
        const data = await searchCPCB(query);
        setCpcbResults(data);
      } else {
        const data = await searchDGMS(query);
        setDgmsResults(data);
      }
    } catch (err) {
      console.error(err);
      const { message, detail } = describeError(err);
      setError(message);
      setErrorDetail(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const hasResults =
    domain === 'cpcb'
      ? cpcbResults?.recomendations && cpcbResults.recomendations.length > 0
      : dgmsResults?.results && dgmsResults.results.length > 0;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header user={user} onLogout={logout} currentPath="/dashboard" />

      <main className="flex-1 flex flex-col relative z-0">
        <HeroSection>
          <DomainSelector
            selected={domain}
            onChange={handleDomainChange}
            disabled={isLoading}
          />
          {/* SearchBar only for CPCB / DGMS — PPE shows camera view */}
          {domain !== 'ppe' && (
            <SearchBar
              domain={domain}
              query={query}
              setQuery={setQuery}
              onSubmit={handleSearch}
              isLoading={isLoading}
              placeholder={PLACEHOLDERS[domain as 'cpcb' | 'dgms']}
              examples={EXAMPLE_QUERIES[domain as 'cpcb' | 'dgms']}
            />
          )}
        </HeroSection>

        {/* PPE camera + detection view */}
        {domain === 'ppe' && <PPEView />}

        {/* CPCB / DGMS results */}
        {domain !== 'ppe' && (
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {isLoading && <LoadingState key="loading" />}

              {!isLoading && error && (
                <ErrorState key="error" error={error} detail={errorDetail} onRetry={handleSearch} />
              )}

              {!isLoading && !error && hasSearched && !hasResults && (
                <EmptyState key="empty" />
              )}

              {!isLoading && !error && hasSearched && hasResults && (
                <ResultsList
                  key="results"
                  cpcbData={cpcbResults}
                  dgmsData={dgmsResults}
                  domain={domain}
                />
              )}
            </AnimatePresence>
          </section>
        )}
      </main>
    </div>
  );
}
