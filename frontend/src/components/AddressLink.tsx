import { formatAddress, getEtherscanUrl } from '../lib/formatters';
import { colors } from '../lib/theme';

interface AddressLinkProps {
  address: string;
  label?: string; // Optional custom label to display
  showKnownLabel?: boolean;
  className?: string;
  colorClass?: string; // Allow custom color override
}

export function AddressLink({ address, label, showKnownLabel = true, className = '', colorClass }: AddressLinkProps) {
  // Use provided label, or fall back to formatted address
  const displayText = label || formatAddress(address, { showKnownLabel });
  const url = getEtherscanUrl(address);
  const linkColor = colorClass || colors.text;
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${linkColor} hover:underline ${className}`}
      title={address} // Show full address on hover
    >
      {displayText}
    </a>
  );
}