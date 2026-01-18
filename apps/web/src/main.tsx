import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { RecoilRoot } from 'recoil';
import { apolloClient } from './lib/apollo';
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <RecoilRoot>
      <ApolloProvider client={apolloClient}>
        <App />
      </ApolloProvider>
    </RecoilRoot>
  </StrictMode>
);
