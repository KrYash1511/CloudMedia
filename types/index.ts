export interface Video {
    id: string;
    title: string;
    description: string | null;
    publicId: string;
    originalSize: string;
    compressedSize: string;
    duration: number;
    userId: string;
    createdAt: string;
    updatedAt: string;
}