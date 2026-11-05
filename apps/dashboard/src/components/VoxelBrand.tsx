/** Shared product wordmark; the original orange symbol stays unchanged in either theme. */
export default function VoxelBrand({ compact = false }: { compact?: boolean }) {
  return <span className={`shophub-brand${compact ? " shophub-brand-compact" : ""}`} role="img" aria-label="Shophub by Voxel Labs">
    <span className="shophub-brand-icon" aria-hidden="true"/>
    <span className="shophub-brand-copy" aria-hidden="true"><span className="shophub-brand-name">Shophub</span><span className="shophub-brand-credit">by Voxel Labs</span></span>
  </span>;
}
