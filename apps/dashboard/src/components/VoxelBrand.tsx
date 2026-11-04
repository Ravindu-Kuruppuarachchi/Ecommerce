import Image from "next/image";

/** The supplied Voxel Labs wordmark. Keep it on a light surface. */
export default function VoxelBrand({ compact = false }: { compact?: boolean }) {
  return <Image src="/brand/voxel-labs-logo.png" alt="Voxel Labs" width={808} height={184} priority className={compact ? "h-auto w-32" : "h-auto w-40 sm:w-44"} />;
}
