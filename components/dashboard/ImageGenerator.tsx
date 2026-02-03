'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { GeneratedImage } from '@/types/user';
import mockImagesData from '@/data/mockImages.json';

interface ImageGeneratorProps {
  onImageGenerate?: (image: GeneratedImage) => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  onImageGenerate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      // Simulate 2-second delay for AI image generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get a random placeholder image from mock data
      const randomIndex = Math.floor(Math.random() * mockImagesData.images.length);
      const mockImage = mockImagesData.images[randomIndex];

      // Create new generated image
      const newImage: GeneratedImage = {
        id: `generated-${Date.now()}`,
        prompt: prompt.trim(),
        url: mockImage.url,
        width: mockImage.width,
        height: mockImage.height,
        createdAt: new Date(),
      };

      // Add to local state
      setGeneratedImages(prev => [newImage, ...prev]);

      // Call callback if provided
      if (onImageGenerate) {
        onImageGenerate(newImage);
      }

      // Clear the prompt
      setPrompt('');
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageClick = (image: GeneratedImage) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const handleDownload = (image: GeneratedImage) => {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `zetca-generated-${image.id}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isGenerating && prompt.trim()) {
      handleGenerate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Generation Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generate AI Images
        </h2>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isGenerating}
              className="w-full"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            isLoading={isGenerating}
            variant="primary"
            leftIcon="solar:magic-stick-3-bold"
          >
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </Button>
        </div>
      </div>

      {/* Generated Images Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Generated Images
        </h3>

        {isGenerating && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <LoadingSkeleton variant="image" className="aspect-square" />
            <LoadingSkeleton variant="image" className="aspect-square hidden md:block" />
          </div>
        )}

        {generatedImages.length === 0 && !isGenerating && (
          <div className="text-center py-12 text-gray-500">
            <Icon 
              icon="solar:gallery-bold" 
              className="w-16 h-16 mx-auto mb-4 text-gray-300" 
            />
            <p className="text-lg font-medium mb-2">No images generated yet</p>
            <p className="text-sm">Enter a prompt above to generate your first AI image</p>
          </div>
        )}

        {generatedImages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedImages.map((image) => (
              <div
                key={image.id}
                className="relative group cursor-pointer bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors"
                onClick={() => handleImageClick(image)}
              >
                <div className="aspect-square relative">
                  <Image
                    src={image.url}
                    alt={image.prompt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon="solar:eye-bold"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleImageClick(image);
                        }}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon="solar:download-bold"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Image Info */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {image.prompt}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Generated {image.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedImage?.prompt || 'Generated Image'}
        size="xl"
        footer={
          selectedImage && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                leftIcon="solar:download-bold"
                onClick={() => handleDownload(selectedImage)}
              >
                Download
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          )
        }
      >
        {selectedImage && (
          <div className="space-y-4">
            <div className="relative aspect-square max-w-lg mx-auto">
              <Image
                src={selectedImage.url}
                alt={selectedImage.prompt}
                fill
                className="object-cover rounded-lg"
                sizes="(max-width: 768px) 100vw, 512px"
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-gray-700">{selectedImage.prompt}</p>
              <p className="text-sm text-gray-500">
                Generated on {selectedImage.createdAt.toLocaleDateString()} at{' '}
                {selectedImage.createdAt.toLocaleTimeString()}
              </p>
              <p className="text-xs text-gray-400">
                {selectedImage.width} × {selectedImage.height} pixels
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};