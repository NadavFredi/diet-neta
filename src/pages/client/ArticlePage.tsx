/**
 * ArticlePage Component
 * 
 * Full-page view for a single knowledge base article
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Calendar, Image as ImageIcon, Video, Loader2, Edit, Trash2, Save, X, Upload, Plus, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { ExternalKnowledgeBaseArticle, ArticleContent, ContentBlock } from '@/hooks/useExternalKnowledgeBase';
import { normalizeContent, useDeleteExternalArticle, useUpdateExternalArticle } from '@/hooks/useExternalKnowledgeBase';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';
import { useToast } from '@/hooks/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Helper to parse video URL and get embed URL
const getVideoEmbedUrl = (url: string): string | null => {
  try {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Direct video URL (mp4, webm, etc.)
    if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
};


// Render content blocks - now handles HTML with embedded images/videos
const renderContentBlocks = (content: ArticleContent, articleTitle: string) => {
  const blocks = content.blocks || [];

  // If we have a text block with HTML content, render it directly with proper styling
  const textBlocks = blocks.filter(b => b.type === 'text');
  if (textBlocks.length > 0 && textBlocks[0].content) {
    const htmlContent = textBlocks[0].content;
    
    return (
      <div
        className="prose prose-lg max-w-none"
        dir="rtl"
        style={{
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#1f2937',
        }}
      >
        <style>{`
          .article-content h1,
          .article-content h2,
          .article-content h3,
          .article-content h4,
          .article-content h5,
          .article-content h6 {
            font-weight: bold;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            color: #111827;
          }
          .article-content h1 { font-size: 2.25em; }
          .article-content h2 { font-size: 1.875em; }
          .article-content h3 { font-size: 1.5em; }
          .article-content h4 { font-size: 1.25em; }
          .article-content p {
            margin-bottom: 1em;
            line-height: 1.8;
          }
          .article-content ul,
          .article-content ol {
            padding-right: 1.5em;
            margin-bottom: 1em;
          }
          .article-content li {
            margin-bottom: 0.5em;
          }
          .article-content strong {
            font-weight: 700;
            color: #111827;
          }
          .article-content em {
            font-style: italic;
          }
          .article-content u {
            text-decoration: underline;
          }
          .article-content a {
            color: #2563eb;
            text-decoration: underline;
          }
          .article-content img {
            height: auto;
            border-radius: 12px;
            margin: 24px auto;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            display: block;
          }
          .article-content .ql-video-container,
          .article-content div[style*="padding-bottom: 56.25%"],
          .article-content div[style*="position: relative"][style*="width: 100%"] {
            position: relative;
            width: 100%;
            padding-bottom: 56.25%;
            margin: 24px 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .article-content .ql-video-container iframe,
          .article-content div[style*="padding-bottom: 56.25%"] iframe,
          .article-content div[style*="position: relative"][style*="width: 100%"] iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 12px;
            border: none;
          }
          .article-content iframe {
            border-radius: 12px;
            margin: 24px 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .article-content iframe[style*="position: absolute"] {
            margin: 0;
          }
        `}</style>
        <div 
          className="article-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    );
  }

  // Fallback: render blocks individually (for legacy content)
  return blocks.map((block: ContentBlock, index: number) => {
    if (block.type === 'text') {
      return (
        <div
          key={index}
          className="prose prose-lg max-w-none mb-6"
          dir="rtl"
          dangerouslySetInnerHTML={{ __html: block.content || '' }}
        />
      );
    }

    if (block.type === 'image' && block.url) {
      return (
        <div key={index} className="my-8">
          <img
            src={block.url}
            alt={block.content || articleTitle}
            className="w-full rounded-lg shadow-md"
          />
          {block.content && (
            <p className="text-sm text-gray-500 mt-2 text-center" dir="rtl">
              {block.content}
            </p>
          )}
        </div>
      );
    }

    if (block.type === 'video' && block.url) {
      const embedUrl = getVideoEmbedUrl(block.url);
      if (embedUrl) {
        return (
          <div key={index} className="my-8">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={block.content || articleTitle}
              />
            </div>
            {block.content && (
              <p className="text-sm text-gray-500 mt-2 text-center" dir="rtl">
                {block.content}
              </p>
            )}
          </div>
        );
      } else {
        return (
          <div key={index} className="my-8">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-blue-600"
              dir="rtl"
            >
              <Video className="h-5 w-5 inline ml-2" />
              {block.content || 'צפה בווידאו'}
              <ArrowRight className="h-4 w-4 inline mr-2" />
            </a>
          </div>
        );
      }
    }

    return null;
  });
};

// Quill modules configuration - will be created with handlers in component

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'align',
  'link',
  'image'
];

export const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteExternalArticle();
  const updateMutation = useUpdateExternalArticle();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    cover_image: null as string | null,
    content: '',
    status: 'draft' as 'draft' | 'published',
  });
  
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const [resizingImage, setResizingImage] = useState<{
    img: HTMLImageElement;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';
  } | null>(null);

  // Check if this is manager view (dashboard route) or client view (client route)
  const isManagerView = location.pathname.startsWith('/dashboard/knowledge-base');

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', id, isManagerView],
    queryFn: async () => {
      if (!id) throw new Error('Article ID is required');

      let query = supabase
        .from('external_knowledge_base')
        .select('*')
        .eq('id', id);

      // Clients can only see published articles, managers can see all
      if (!isManagerView) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as ExternalKnowledgeBaseArticle;
    },
    enabled: !!id,
  });

  // Initialize edit data when article loads or edit mode is enabled
  useEffect(() => {
    if (article && isEditing) {
      const normalized = normalizeContent(article.content);
      
      // Convert blocks to HTML: combine text blocks and embed images/videos as HTML
      let htmlContent = '';
      normalized.blocks.forEach((block) => {
        if (block.type === 'text') {
          htmlContent += block.content || '';
        } else if (block.type === 'image' && block.url) {
          const alt = block.content || '';
          htmlContent += `<img src="${block.url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />`;
          if (alt) {
            htmlContent += `<p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 8px;">${alt}</p>`;
          }
        } else if (block.type === 'video' && block.url) {
          const embedUrl = getVideoEmbedUrl(block.url);
          if (embedUrl) {
            htmlContent += `<div style="position: relative; width: 100%; padding-bottom: 56.25%; margin: 16px 0;">
              <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" allowfullscreen></iframe>
            </div>`;
          } else {
            htmlContent += `<a href="${block.url}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0; text-align: center; color: #2563eb;">${block.content || 'צפה בווידאו'}</a>`;
          }
        }
      });
      
      setEditData({
        title: article.title || '',
        cover_image: article.cover_image,
        content: htmlContent || '',
        status: article.status || 'draft',
      });
    }
  }, [article, isEditing]);

  // Insert image - will be resizable after insertion
  const insertImage = React.useCallback((url: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) {
      toast({ title: 'שגיאה', description: 'עורך הטקסט לא זמין', variant: 'destructive' });
      return;
    }

    const range = quill.getSelection(true);
    if (!range) {
      // If no selection, insert at end
      const length = quill.getLength();
      range = { index: length - 1, length: 0 };
    }

    // Insert image with default medium size and data attribute for resizing
    const imageHtml = `<img src="${url}" data-resizable="true" style="width: 500px; height: auto; border-radius: 12px; margin: 24px auto; display: block; cursor: move; position: relative;" />`;
    quill.clipboard.dangerouslyPasteHTML(range.index, imageHtml);
    quill.setSelection(range.index + 1);
    
    // Add resize handlers after DOM update
    setTimeout(() => {
      setupImageResizeHandlers(quill);
    }, 100);
    
    toast({ title: 'הצלחה', description: 'התמונה הוספה לתוכן. תוכל לגרור את הפינות לשינוי גודל' });
  }, [toast]);

  // Setup resize handlers for images in the editor
  const setupImageResizeHandlers = React.useCallback((quill: any) => {
    const editor = quill.container.querySelector('.ql-editor');
    if (!editor) return;

    // Remove existing handlers
    const existingImages = editor.querySelectorAll('img[data-resizable="true"]');
    existingImages.forEach((img: HTMLImageElement) => {
      // Remove old resize handles
      const existingHandles = img.parentElement?.querySelectorAll('.resize-handle');
      existingHandles?.forEach(handle => handle.remove());
    });

    // Add handlers to all images
    const images = editor.querySelectorAll('img[data-resizable="true"]');
    images.forEach((img: HTMLImageElement) => {
      if (img.parentElement?.querySelector('.resize-handle')) return; // Already has handles

      img.style.position = 'relative';
      img.style.display = 'block';
      img.style.margin = '24px auto';
      
      // Create resize handles container
      const handlesContainer = document.createElement('div');
      handlesContainer.style.position = 'absolute';
      handlesContainer.style.top = '0';
      handlesContainer.style.left = '0';
      handlesContainer.style.width = '100%';
      handlesContainer.style.height = '100%';
      handlesContainer.style.pointerEvents = 'none';
      handlesContainer.className = 'resize-handles-container';

      // Create handles for corners and edges
      const handles = [
        { position: 'nw', cursor: 'nwse-resize' },
        { position: 'ne', cursor: 'nesw-resize' },
        { position: 'sw', cursor: 'nesw-resize' },
        { position: 'se', cursor: 'nwse-resize' },
        { position: 'n', cursor: 'ns-resize' },
        { position: 's', cursor: 'ns-resize' },
        { position: 'e', cursor: 'ew-resize' },
        { position: 'w', cursor: 'ew-resize' },
      ];

      handles.forEach(({ position, cursor }) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${position}`;
        handle.style.position = 'absolute';
        handle.style.width = '12px';
        handle.style.height = '12px';
        handle.style.backgroundColor = '#5B6FB9';
        handle.style.border = '2px solid white';
        handle.style.borderRadius = '50%';
        handle.style.cursor = cursor;
        handle.style.pointerEvents = 'all';
        handle.style.zIndex = '1000';
        handle.style.display = 'none'; // Hidden by default, show on hover

        // Position handle
        if (position.includes('n')) handle.style.top = '-6px';
        if (position.includes('s')) handle.style.bottom = '-6px';
        if (position.includes('w')) handle.style.right = '-6px';
        if (position.includes('e')) handle.style.left = '-6px';
        if (position === 'n' || position === 's') {
          handle.style.left = '50%';
          handle.style.transform = 'translateX(-50%)';
        }
        if (position === 'e' || position === 'w') {
          handle.style.top = '50%';
          handle.style.transform = 'translateY(-50%)';
        }

        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e, img, position as any);
        });

        handlesContainer.appendChild(handle);
      });

      // Wrap image in container if not already wrapped
      if (!img.parentElement?.classList.contains('image-resize-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-resize-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.margin = '24px auto';
        wrapper.style.maxWidth = '100%';
        img.parentNode?.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(handlesContainer);
      } else {
        img.parentElement.appendChild(handlesContainer);
      }

      // Show handles on hover
      img.addEventListener('mouseenter', () => {
        handlesContainer.querySelectorAll('.resize-handle').forEach((h: Element) => {
          (h as HTMLElement).style.display = 'block';
        });
      });

      const parent = img.parentElement;
      if (parent) {
        parent.addEventListener('mouseleave', () => {
          handlesContainer.querySelectorAll('.resize-handle').forEach((h: Element) => {
            (h as HTMLElement).style.display = 'none';
          });
        });
      }
    });
  }, []);

  // Handle resize start
  const handleResizeStart = React.useCallback((e: MouseEvent, img: HTMLImageElement, handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's') => {
    e.preventDefault();
    e.stopPropagation();

    const rect = img.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;

    setResizingImage({ img, startX, startY, startWidth, startHeight, handle });

    document.body.style.userSelect = 'none';
    document.body.style.cursor = handle.includes('n') && handle.includes('e') ? 'nesw-resize' :
                                  handle.includes('n') && handle.includes('w') ? 'nwse-resize' :
                                  handle.includes('s') && handle.includes('e') ? 'nwse-resize' :
                                  handle.includes('s') && handle.includes('w') ? 'nesw-resize' :
                                  handle === 'n' || handle === 's' ? 'ns-resize' : 'ew-resize';
  }, []);

  // Handle resize during drag
  useEffect(() => {
    if (!resizingImage) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { img, startX, startY, startWidth, startHeight, handle } = resizingImage;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;

      // Calculate new dimensions based on handle
      if (handle.includes('e')) {
        newWidth = startWidth + deltaX;
      }
      if (handle.includes('w')) {
        newWidth = startWidth - deltaX;
      }
      if (handle.includes('s')) {
        const aspectRatio = startHeight / startWidth;
        newHeight = startHeight + deltaY;
        if (handle === 's' || handle.includes('s')) {
          newWidth = newHeight / aspectRatio;
        }
      }
      if (handle.includes('n')) {
        const aspectRatio = startHeight / startWidth;
        newHeight = startHeight - deltaY;
        if (handle === 'n' || handle.includes('n')) {
          newWidth = newHeight / aspectRatio;
        }
      }

      // Maintain aspect ratio for corner handles
      if (handle.length === 2) {
        const aspectRatio = startHeight / startWidth;
        if (handle.includes('n') || handle.includes('s')) {
          newWidth = newHeight / aspectRatio;
        } else {
          newHeight = newWidth * aspectRatio;
        }
      }

      // Apply min/max constraints
      newWidth = Math.max(100, Math.min(newWidth, 1200));
      newHeight = Math.max(100, Math.min(newHeight, 1200));

      // Apply new dimensions
      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
      img.style.maxWidth = 'none';
    };

    const handleMouseUp = () => {
      setResizingImage(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // Update Quill content with new dimensions
      const quill = quillRef.current?.getEditor();
      if (quill) {
        // Trigger change to save new dimensions
        const html = quill.root.innerHTML;
        setEditData(prev => ({ ...prev, content: html }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [resizingImage]);

      // Setup resize handlers when content changes
      useEffect(() => {
        if (!isEditing) return;
        const quill = quillRef.current?.getEditor();
        if (quill) {
          // Small delay to ensure DOM is updated
          const timeout = setTimeout(() => {
            setupImageResizeHandlers(quill);
          }, 100);
          return () => clearTimeout(timeout);
        }
      }, [editData.content, isEditing, setupImageResizeHandlers]);

  // Create Quill modules with handlers
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: function(this: any) {
          const quill = this.quill;
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            
            setIsUploadingImage(true);
            try {
              if (!file.type.startsWith('image/')) {
                throw new Error('קובץ התמונה אינו תקין');
              }
              if (file.size > 10 * 1024 * 1024) {
                throw new Error('קובץ גדול מדי (מקסימום 10MB)');
              }

              const timestamp = Date.now();
              const fileExt = file.name.split('.').pop();
              const fileName = `inline-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              const filePath = `knowledge-base/images/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('client-assets')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

              if (uploadError) throw uploadError;

              const { data: urlData, error: urlError } = await supabase.storage
                .from('client-assets')
                .createSignedUrl(filePath, 31536000);

              if (urlError || !urlData?.signedUrl) {
                throw new Error('לא ניתן לקבל קישור לתמונה');
              }

              // Insert image directly (will be resizable)
              insertImage(urlData.signedUrl);
            } catch (error: any) {
              toast({ title: 'שגיאה', description: error?.message || 'נכשל בהעלאת התמונה', variant: 'destructive' });
            } finally {
              setIsUploadingImage(false);
            }
          };
        },
        video: function(this: any) {
          const quill = this.quill;
          const url = prompt('הכנס קישור וידאו (YouTube, Vimeo וכו\'):');
          if (!url) return;

          const embedUrl = getVideoEmbedUrl(url);
          if (embedUrl) {
            const range = quill.getSelection(true);
            if (range) {
              // Insert video as HTML - use a more direct approach
              const videoHtml = `<div class="ql-video-container" style="position: relative; width: 100%; padding-bottom: 56.25%; margin: 24px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background: #000; border-radius: 12px; overflow: hidden;">
                <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allowfullscreen="true" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
              </div>`;
              
              // Directly manipulate DOM to insert video, then sync with Quill
              const editor = quill.root;
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = videoHtml;
              const videoContainer = tempDiv.firstChild as Node;
              
              if (range.index >= editor.childNodes.length) {
                // Append to end
                const p = document.createElement('p');
                p.appendChild(document.createElement('br'));
                editor.appendChild(p);
                editor.insertBefore(videoContainer, p);
              } else {
                // Insert at position
                const targetNode = editor.childNodes[range.index];
                if (targetNode) {
                  editor.insertBefore(videoContainer, targetNode);
                } else {
                  editor.appendChild(videoContainer);
                }
              }
              
              // Force Quill to recognize the change
              quill.update('user');
              
              // Move cursor after video
              const newLength = quill.getLength();
              quill.setSelection(newLength - 1);
              
              toast({ title: 'הצלחה', description: 'הווידאו הוסף לתוכן' });
            }
          } else {
            toast({ title: 'שגיאה', description: 'קישור וידאו לא תקין. אנא השתמש בקישור YouTube או Vimeo', variant: 'destructive' });
          }
        }
      }
    },
  }), []);

  const handleDelete = async () => {
    if (!article || !isManagerView) return;

    if (window.confirm('האם אתה בטוח שברצונך למחוק מאמר זה?')) {
      try {
        await deleteMutation.mutateAsync(article.id);
        navigate('/dashboard/knowledge-base');
        toast({
          title: 'הצלחה',
          description: 'המאמר נמחק בהצלחה',
        });
      } catch (error) {
        // Error handled in mutation
      }
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    setIsUploadingCover(true);
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('קובץ התמונה אינו תקין');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('קובץ גדול מדי (מקסימום 10MB)');
      }

      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `knowledge-base/images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(filePath, 31536000);

      if (urlError || !urlData?.signedUrl) {
        throw new Error('לא ניתן לקבל קישור לתמונה');
      }

      setEditData(prev => ({ ...prev, cover_image: urlData.signedUrl }));
      toast({ title: 'הצלחה', description: 'תמונת הכריכה הועלתה בהצלחה' });
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error?.message || 'נכשל בהעלאת תמונת הכריכה', variant: 'destructive' });
    } finally {
      setIsUploadingCover(false);
      if (coverImageInputRef.current) coverImageInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!article || !editData.title.trim()) {
      toast({ title: 'שגיאה', description: 'כותרת היא שדה חובה', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      // Save the HTML content directly - it already contains embedded images and videos
      // The HTML from ReactQuill includes all formatting and embedded media
      await updateMutation.mutateAsync({
        id: article.id,
        updates: {
          title: editData.title.trim(),
          cover_image: editData.cover_image,
          content: { blocks: [{ type: 'text', content: editData.content }] },
          status: editData.status,
          images: [], // Legacy
          videos: [], // Legacy
        },
      });

      setIsEditing(false);
      toast({ title: 'הצלחה', description: 'המאמר עודכן בהצלחה' });
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const normalizedContent = useMemo(() => {
    if (!article?.content) return { blocks: [] };
    return normalizeContent(article.content);
  }, [article?.content]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#5B6FB9] mx-auto mb-4" />
          <p className="text-gray-500">טוען מאמר...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">מאמר לא נמצא</h1>
            <p className="text-gray-500 mb-6">המאמר שביקשת לא נמצא או אינו זמין.</p>
            <Button
              onClick={() => navigate('/client/dashboard?tab=knowledgebase')}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
            >
              חזור למאגר הידע
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header with back button and actions */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                if (isManagerView) {
                  navigate('/dashboard/knowledge-base');
                } else {
                  navigate('/client/dashboard?tab=knowledgebase');
                }
              }}
              className="text-[#5B6FB9] hover:text-[#5B6FB9]/80"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              {isManagerView ? 'חזור למאגר הידע' : 'חזור למאגר הידע'}
            </Button>

            {/* Manager actions */}
            {isManagerView && article && (
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-[#5B6FB9] border-[#5B6FB9] hover:bg-[#5B6FB9]/10"
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      ערוך
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      מחק
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4 ml-2" />
                      ביטול
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          שומר...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 ml-2" />
                          שמור
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">סטטוס</Label>
              <Select
                value={editData.status}
                onValueChange={(value: 'draft' | 'published') => setEditData({ ...editData, status: value })}
              >
                <SelectTrigger className="w-full bg-gray-50" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      טיוטה
                    </div>
                  </SelectItem>
                  <SelectItem value="published">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      מפורסם
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-2 block">
                כותרת *
              </Label>
              <Input
                id="title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="הכנס כותרת"
                className="bg-gray-50 text-2xl font-bold"
                dir="rtl"
              />
            </div>

            {/* Cover Image */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">תמונת כריכה</Label>
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverImageUpload(file);
                }}
                className="hidden"
              />
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverImageInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 ml-2" />
                  {editData.cover_image ? 'החלף תמונת כריכה' : 'העלה תמונת כריכה'}
                </Button>
                {editData.cover_image && (
                  <div className="relative">
                    <img
                      src={editData.cover_image}
                      alt="תמונת כריכה"
                      className="w-full h-[400px] object-cover rounded-xl shadow-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-4 left-4"
                      onClick={() => setEditData({ ...editData, cover_image: null })}
                    >
                      <X className="h-4 w-4 ml-2" />
                      מחק
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Rich Text Content */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">תוכן המאמר *</Label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <style>{`
                  .article-editor .ql-editor {
                    min-height: 500px;
                    font-size: 16px;
                    line-height: 1.8;
                    color: #1f2937;
                    text-align: right;
                    direction: rtl;
                  }
                  .article-editor .ql-editor.ql-blank::before {
                    font-style: normal;
                    color: #9ca3af;
                    right: 15px;
                    left: auto;
                  }
                  .article-editor .ql-container {
                    font-family: 'Assistant', 'Heebo', sans-serif;
                    direction: rtl;
                  }
                  .article-editor .ql-toolbar {
                    border-bottom: 1px solid #e5e7eb;
                    background: #f9fafb;
                    direction: rtl;
                  }
                  .article-editor .ql-editor .image-resize-wrapper {
                    position: relative;
                    display: inline-block;
                    margin: 24px auto;
                    max-width: 100%;
                  }
                  .article-editor .ql-editor .image-resize-wrapper img {
                    max-width: none;
                    height: auto;
                    border-radius: 12px;
                    margin: 0;
                    display: block;
                    cursor: move;
                  }
                  .article-editor .ql-editor .image-resize-wrapper:hover {
                    outline: 2px solid #5B6FB9;
                    outline-offset: 4px;
                    border-radius: 12px;
                  }
                  .article-editor .ql-editor img:not(.image-resize-wrapper img) {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    margin: 24px auto;
                    display: block;
                    cursor: pointer;
                  }
                  .article-editor .ql-editor img:not(.image-resize-wrapper img):hover {
                    outline: 2px solid #5B6FB9;
                    outline-offset: 2px;
                  }
                  .article-editor .ql-editor .ql-video-container {
                    position: relative;
                    width: 100%;
                    padding-bottom: 56.25%;
                    margin: 24px 0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    background: #000;
                    border-radius: 12px;
                    overflow: hidden;
                  }
                  .article-editor .ql-editor .ql-video-container iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                  }
                  .article-editor .ql-editor div[style*="padding-bottom: 56.25%"] {
                    margin: 24px 0;
                  }
                  .article-editor .ql-editor iframe:not(.ql-video-container iframe) {
                    border-radius: 12px;
                    margin: 24px 0;
                  }
                  .article-editor .ql-editor h1,
                  .article-editor .ql-editor h2,
                  .article-editor .ql-editor h3,
                  .article-editor .ql-editor h4,
                  .article-editor .ql-editor h5,
                  .article-editor .ql-editor h6 {
                    font-weight: bold;
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                  }
                  .article-editor .ql-editor p {
                    margin-bottom: 1em;
                  }
                  .article-editor .ql-editor ul,
                  .article-editor .ql-editor ol {
                    padding-right: 1.5em;
                    margin-bottom: 1em;
                  }
                `}</style>
                <ReactQuill
                  ref={quillRef}
                  value={editData.content}
                  onChange={(value) => setEditData({ ...editData, content: value })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="הקלד את תוכן המאמר כאן... לחץ על כפתור התמונה או הווידאו כדי להוסיף מדיה"
                  className="article-editor"
                  theme="snow"
                />
              </div>
            </div>

          </div>
        ) : (
          /* View Mode */
          <>
            {/* Cover Image */}
            {article.cover_image && (
              <div className="mb-8">
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full h-[400px] object-cover rounded-xl shadow-lg"
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>

            {/* Date */}
            <div className="flex items-center gap-2 text-gray-500 mb-8">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(article.created_at).toLocaleDateString('he-IL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Content Blocks */}
            <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
              {normalizedContent.blocks.length > 0 ? (
                renderContentBlocks(normalizedContent, article.title)
              ) : (
                <p className="text-gray-500">אין תוכן זמין.</p>
              )}
            </div>
          </>
        )}
      </article>
    </div>
  );
};
