import React, { useState } from 'react';
import { Button } from './button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ExpandableContentProps {
  content: string;
  maxLength?: number;
  isMarkdown?: boolean;
}

export const ExpandableContent: React.FC<ExpandableContentProps> = ({
  content,
  maxLength = 200,
  isMarkdown = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) {
    return null;
  }

  const isLongContent = content.length > maxLength;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    const displayedContent = isExpanded ? content : `${content.substring(0, maxLength)}${isLongContent ? '...' : ''}`;
    if (isMarkdown) {
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent}</ReactMarkdown>;
    }
    return <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{displayedContent}</p>;
  };

  return (
    <div>
      {renderContent()}
      {isLongContent && (
        <Button
          variant="link"
          className="px-0 h-auto text-sm mt-1"
          onClick={toggleExpand}
        >
          {isExpanded ? (
            <>
              Show Less
              <ChevronUp className="w-4 h-4 ml-1" />
            </>
          ) : (
            <>
              Show More
              <ChevronDown className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}; 