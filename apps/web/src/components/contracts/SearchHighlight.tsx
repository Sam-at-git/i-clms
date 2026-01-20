import { highlightMatch } from './ContractSearch';

interface SearchHighlightProps {
  text: string | null | undefined;
  query: string;
}

/**
 * Component to display text with highlighted search matches
 * Uses dangerouslySetInnerHTML to render the HTML from highlightMatch
 */
export function SearchHighlight({ text, query }: SearchHighlightProps) {
  const highlighted = highlightMatch(text, query);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

interface HighlightedContractNameProps {
  name: string;
  query: string;
}

/**
 * Component for displaying contract name with search highlighting
 */
export function HighlightedContractName({ name, query }: HighlightedContractNameProps) {
  return <SearchHighlight text={name} query={query} />;
}

interface HighlightedContractNoProps {
  contractNo: string;
  query: string;
}

/**
 * Component for displaying contract number with search highlighting
 */
export function HighlightedContractNo({ contractNo, query }: HighlightedContractNoProps) {
  return <SearchHighlight text={contractNo} query={query} />;
}

interface HighlightedCustomerNameProps {
  customerName: string;
  query: string;
}

/**
 * Component for displaying customer name with search highlighting
 */
export function HighlightedCustomerName({ customerName, query }: HighlightedCustomerNameProps) {
  return <SearchHighlight text={customerName} query={query} />;
}
