import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { 
  ArrowLeft, Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
  Table, Paperclip, Image, Link, MoreHorizontal, Clock,
  Palette, Highlighter, Minus, Plus, Eye, Download,
  Settings, FileText, Calculator, Search, ChevronDown, ChevronUp, Edit
} from "lucide-react";

export default function Forms() {
  const [documentContent, setDocumentContent] = useState("");
  const [fontFamily, setFontFamily] = useState("verdana");
  const [fontSize, setFontSize] = useState("12pt");
  const [textStyle, setTextStyle] = useState("heading2");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [showFormFields, setShowFormFields] = useState(true);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const [selectedHeader, setSelectedHeader] = useState("your-clinic");
  const [showEditClinic, setShowEditClinic] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [clinicInfo, setClinicInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: ""
  });
  const { toast } = useToast();

  // Fetch organization data
  const { data: organization } = useQuery({
    queryKey: ["/api/tenant/info"],
    queryFn: async () => {
      const response = await fetch('/api/tenant/info', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }
  });

  // Update clinic info when organization data loads
  useEffect(() => {
    if (organization) {
      setClinicInfo({
        name: organization.name || "Your Clinic",
        address: organization.address || "123 Healthcare Street, Medical City, MC 12345",
        phone: organization.phone || "+44 20 1234 5678",
        email: organization.email || "info@yourclinic.com",
        website: organization.website || "www.yourclinic.com"
      });
    }
  }, [organization]);

  const handleSaveClinicInfo = async () => {
    try {
      const response = await fetch('/api/organization/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          name: clinicInfo.name,
          address: clinicInfo.address,
          phone: clinicInfo.phone,
          email: clinicInfo.email,
          website: clinicInfo.website
        })
      });

      if (response.ok) {
        toast({
          title: "Clinic Information Updated",
          description: "Your clinic information has been saved successfully."
        });
        setShowEditClinic(false);
      } else {
        throw new Error('Failed to update clinic information');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update clinic information. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePreview = () => {
    toast({ title: "Save and Preview", description: "Document saved and preview opened." });
  };

  const handleSaveAsDraft = () => {
    toast({ title: "Save as Draft", description: "Document saved as draft." });
  };

  const handleBold = () => {
    if (!textareaRef) return;
    
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = documentContent.substring(start, end);
    
    if (!selectedText) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply bold formatting",
        duration: 3000
      });
      return;
    }

    // For textarea, we'll just wrap with **bold** markdown style
    const beforeText = documentContent.substring(0, start);
    const afterText = documentContent.substring(end);
    const newContent = beforeText + `**${selectedText}**` + afterText;
    
    setDocumentContent(newContent);
    
    // Restore cursor position after the formatting
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus();
        textareaRef.setSelectionRange(start + 2, end + 2);
      }
    }, 0);
    
    toast({ 
      title: "✓ Bold Applied",
      description: "Bold formatting applied to selected text",
      duration: 2000
    });
  };

  const handleItalic = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply italic formatting",
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply italic formatting",
        duration: 3000
      });
      return;
    }

    // Create a span with italic styling
    const span = document.createElement('span');
    span.style.fontStyle = 'italic';
    span.textContent = selectedText;
    
    // Replace the selected content with the new span
    range.deleteContents();
    range.insertNode(span);
    
    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    toast({ 
      title: "✓ Italic Applied",
      description: "Italic formatting applied to selected text",
      duration: 2000
    });
  };

  const handleUnderline = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply underline formatting",
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply underline formatting",
        duration: 3000
      });
      return;
    }

    // Create a span with underline styling
    const span = document.createElement('span');
    span.style.textDecoration = 'underline';
    span.textContent = selectedText;
    
    // Replace the selected content with the new span
    range.deleteContents();
    range.insertNode(span);
    
    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    toast({ 
      title: "✓ Underline Applied",
      description: "Underline formatting applied to selected text",
      duration: 2000
    });
  };
  const handleBulletList = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply bullet list formatting",
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    
    // Get the container element and extract all text nodes
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // Get all direct child nodes to preserve line structure
    const childNodes = Array.from(tempDiv.childNodes);
    const lines = [];
    
    // Process each child node to extract text while preserving line breaks
    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          // Split text node by line breaks if any exist
          const textLines = text.split('\n').filter(line => line.trim() !== '');
          lines.push(...textLines);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.textContent?.trim();
        if (text) {
          lines.push(text);
        }
      }
    });
    
    // If we still don't have multiple lines, try a different approach
    if (lines.length <= 1) {
      const selectedText = range.toString();
      if (selectedText) {
        // Check for line breaks in the original selection
        const textLines = selectedText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (textLines.length > 1) {
          lines.splice(0, lines.length, ...textLines);
        } else {
          // As fallback, use the single line
          if (selectedText.trim()) {
            lines.splice(0, lines.length, selectedText.trim());
          }
        }
      }
    }
    
    if (lines.length === 0) {
      toast({ 
        title: "No Content", 
        description: "No text found to convert to bullet list",
        duration: 3000
      });
      return;
    }
    
    const ul = document.createElement('ul');
    ul.style.marginLeft = '20px';
    ul.style.listStyleType = 'disc';
    ul.style.paddingLeft = '20px';
    
    lines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line.trim();
      li.style.marginBottom = '4px';
      li.style.lineHeight = '1.5';
      ul.appendChild(li);
    });
    
    // Replace the selected content with the bullet list
    range.deleteContents();
    range.insertNode(ul);
    
    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    toast({ 
      title: "✓ Bullet List Applied",
      description: `Bullet list created with ${lines.length} items`,
      duration: 2000
    });
  };
  const handleNumberedList = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply numbered list formatting",
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    
    // Get the container element and extract all text nodes
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // Get all direct child nodes to preserve line structure
    const childNodes = Array.from(tempDiv.childNodes);
    const lines = [];
    
    // Process each child node to extract text while preserving line breaks
    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          // Split text node by line breaks if any exist
          const textLines = text.split('\n').filter(line => line.trim() !== '');
          lines.push(...textLines);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.textContent?.trim();
        if (text) {
          lines.push(text);
        }
      }
    });
    
    // If we still don't have multiple lines, try a different approach
    if (lines.length <= 1) {
      const selectedText = range.toString();
      if (selectedText) {
        // Check for line breaks in the original selection
        const textLines = selectedText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (textLines.length > 1) {
          lines.splice(0, lines.length, ...textLines);
        } else {
          // As fallback, use the single line
          if (selectedText.trim()) {
            lines.splice(0, lines.length, selectedText.trim());
          }
        }
      }
    }
    
    if (lines.length === 0) {
      toast({ 
        title: "No Content", 
        description: "No text found to convert to numbered list",
        duration: 3000
      });
      return;
    }
    
    const ol = document.createElement('ol');
    ol.style.marginLeft = '20px';
    ol.style.paddingLeft = '40px';
    ol.style.listStyleType = 'decimal';
    ol.style.listStylePosition = 'outside';
    
    lines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line.trim();
      li.style.marginBottom = '4px';
      li.style.lineHeight = '1.5';
      ol.appendChild(li);
    });
    
    // Replace the selected content with the numbered list
    range.deleteContents();
    range.insertNode(ol);
    
    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    toast({ 
      title: "✓ Numbered List Applied",
      description: `Numbered list created with ${lines.length} items`,
      duration: 2000
    });
  };
  const handleAlignLeft = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply left alignment",
        duration: 3000
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand('justifyLeft', false);
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Left Alignment Applied",
        description: "Text aligned to the left",
        duration: 2000
      });
    } catch (error) {
      console.error('Left alignment error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to apply left alignment",
        duration: 3000
      });
    }
  };

  const handleAlignCenter = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply center alignment",
        duration: 3000
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand('justifyCenter', false);
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Center Alignment Applied",
        description: "Text centered successfully",
        duration: 2000
      });
    } catch (error) {
      console.error('Center alignment error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to apply center alignment",
        duration: 3000
      });
    }
  };

  const handleAlignRight = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply right alignment",
        duration: 3000
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand('justifyRight', false);
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Right Alignment Applied",
        description: "Text aligned to the right",
        duration: 2000
      });
    } catch (error) {
      console.error('Right alignment error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to apply right alignment",
        duration: 3000
      });
    }
  };

  const handleAlignJustify = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply justify alignment",
        duration: 3000
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand('justifyFull', false);
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Justify Alignment Applied",
        description: "Text justified successfully",
        duration: 2000
      });
    } catch (error) {
      console.error('Justify alignment error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to apply justify alignment",
        duration: 3000
      });
    }
  };
  const handleTable = () => {
    try {
      // Create a basic 3x3 table HTML structure with empty cells and ensure cursor positioning after table
      const tableHTML = `
        <table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
          </tr>
        </table>
        <p><br></p>
      `;

      // Insert the table at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create a temporary div to hold the table HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = tableHTML;
        
        // Insert all elements (table and paragraph)
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        
        range.insertNode(fragment);
        
        // Position cursor in the paragraph after the table
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Ensure the editor maintains focus
        if (textareaRef) {
          textareaRef.focus();
        }
      } else {
        // If no selection, insert at the end of the content
        if (textareaRef) {
          const currentContent = textareaRef.innerHTML || '';
          textareaRef.innerHTML = currentContent + tableHTML;
          setDocumentContent(textareaRef.innerHTML);
        }
      }
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Table Inserted",
        description: "3x3 empty table successfully inserted",
        duration: 2000
      });
    } catch (error) {
      console.error('Insert table error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to insert table",
        duration: 3000
      });
    }
  };
  const handleAttachFile = () => {
    try {
      // Create a hidden file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif';
      fileInput.style.display = 'none';
      
      // Handle file selection
      fileInput.onchange = (event: any) => {
        const file = event.target.files?.[0];
        if (file) {
          // Create a proper inline file attachment with styling
          const fileSize = (file.size / 1024).toFixed(1);
          const fileAttachmentHTML = `
            <span style="display: inline-block; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 4px; padding: 4px 8px; margin: 0 2px; color: #0369a1; font-family: Arial, sans-serif; font-size: 12px; vertical-align: middle;">
              <span style="margin-right: 4px;">📎</span>
              <strong>${file.name}</strong>
              <span style="color: #64748b; margin-left: 4px;">(${fileSize} KB)</span>
            </span>
          `;
          
          // Insert the file attachment at cursor position
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            // Create a temporary div to hold the attachment HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = fileAttachmentHTML;
            const attachmentElement = tempDiv.firstElementChild;
            
            if (attachmentElement) {
              range.insertNode(attachmentElement);
              
              // Move cursor after the attachment
              range.setStartAfter(attachmentElement);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } else {
            // If no selection, insert at the end of the content
            if (textareaRef) {
              const currentContent = textareaRef.innerHTML || '';
              textareaRef.innerHTML = currentContent + fileAttachmentHTML;
              setDocumentContent(textareaRef.innerHTML);
            }
          }
          
          // Update the document content state
          if (textareaRef) {
            setDocumentContent(textareaRef.innerHTML);
          }
          
          toast({ 
            title: "✓ File Attached",
            description: `File "${file.name}" attached successfully`,
            duration: 2000
          });
        }
        
        // Clean up
        document.body.removeChild(fileInput);
      };
      
      // Add to DOM and trigger click
      document.body.appendChild(fileInput);
      fileInput.click();
      
    } catch (error) {
      console.error('Attach file error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to attach file",
        duration: 3000
      });
    }
  };
  const handleInsertTemplate = () => toast({ title: "Insert Template", description: "Template insertion dialog opened." });
  const handleInsertLogo = () => toast({ title: "Insert Logo", description: "Logo insertion dialog opened." });
  const handleClinic = () => toast({ title: "Clinic", description: "Clinic information options opened." });
  const handlePatient = () => toast({ title: "Patient", description: "Patient information options opened." });
  const handleRecipient = () => toast({ title: "Recipient", description: "Recipient information options opened." });
  const handleAppointments = () => toast({ title: "Appointments", description: "Appointment information options opened." });
  const handleLabs = () => toast({ title: "Labs", description: "Lab results options opened." });
  const handlePatientRecords = () => toast({ title: "Patient Records", description: "Patient records options opened." });
  const handleInsertProduct = () => toast({ title: "Insert Product", description: "Product insertion dialog opened." });
  const handleImage = () => {
    try {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target?.result as string;
            
            if (!textareaRef) {
              toast({
                title: "Error",
                description: "Document editor not ready",
                duration: 3000
              });
              return;
            }
            
            // Get current selection/cursor position for contentEditable
            const selection = window.getSelection();
            let range: Range | null = null;
            
            if (selection && selection.rangeCount > 0) {
              range = selection.getRangeAt(0);
            } else {
              // If no selection, create range at the end of content
              range = document.createRange();
              if (textareaRef && textareaRef.childNodes.length > 0) {
                range.setStartAfter(textareaRef.lastChild!);
              } else if (textareaRef) {
                range.setStart(textareaRef, 0);
              }
              range.collapse(true);
            }
            
            // Create image element
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = file.name;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '10px 0';
            
            // Insert image at cursor position
            if (range && textareaRef) {
              range.deleteContents();
              range.insertNode(img);
              
              // Move cursor after the image
              range.setStartAfter(img);
              range.collapse(true);
              
              // Update selection
              selection?.removeAllRanges();
              selection?.addRange(range);
              
              // Update document content
              setDocumentContent(textareaRef.innerHTML);
              
              // Focus the editor
              textareaRef.focus();
            }
            
            toast({
              title: "✓ Image Inserted",
              description: `Image "${file.name}" added to document`,
              duration: 2000
            });
          };
          reader.readAsDataURL(file);
        }
        
        // Clean up
        document.body.removeChild(input);
      };
      
      // Add to DOM and trigger click
      document.body.appendChild(input);
      input.click();
      
    } catch (error) {
      console.error('Image insertion error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to insert image",
        duration: 3000
      });
    }
  };
  const handleLink = () => {
    // Get current selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setSavedSelection(range.cloneRange());
      
      // If text is selected, use it as link text
      const selectedText = selection.toString();
      if (selectedText) {
        setLinkText(selectedText);
      } else {
        setLinkText("");
      }
    } else {
      setSavedSelection(null);
      setLinkText("");
    }
    
    setLinkUrl("");
    setShowLinkDialog(true);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL",
        duration: 3000
      });
      return;
    }

    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      const selection = window.getSelection();
      let range = savedSelection;

      if (!range && selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }

      if (!range) {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      // Create link element
      const link = document.createElement('a');
      link.href = linkUrl;
      link.textContent = linkText || linkUrl;
      link.style.color = '#2563eb';
      link.style.textDecoration = 'underline';
      link.target = '_blank';

      // Insert link
      range.deleteContents();
      range.insertNode(link);

      // Move cursor after the link
      range.setStartAfter(link);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog and reset
      setShowLinkDialog(false);
      setLinkUrl("");
      setLinkText("");
      setSavedSelection(null);

      toast({
        title: "✓ Link Inserted",
        description: `Link "${linkText || linkUrl}" added to document`,
        duration: 2000
      });

    } catch (error) {
      console.error('Link insertion error:', error);
      toast({
        title: "Error",
        description: "Failed to insert link",
        duration: 3000
      });
    }
  };
  const handleHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply highlighting",
        duration: 3000
      });
      return;
    }

    try {
      // Apply yellow background highlighting using document.execCommand
      document.execCommand('hiliteColor', false, '#FFFF00');
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Text Highlighted",
        description: "Yellow highlighting applied to selected text",
        duration: 2000
      });
    } catch (error) {
      console.error('Highlight error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to apply highlighting",
        duration: 3000
      });
    }
  };
  const handleClock = () => {
    try {
      // Get current date and time
      const now = new Date();
      const currentTime = now.toLocaleString('en-GB', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Insert the time at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(currentTime));
        
        // Move cursor to end of inserted text
        range.setStartAfter(range.endContainer);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, try to insert at the end of the content
        if (textareaRef) {
          const currentContent = textareaRef.innerHTML || '';
          textareaRef.innerHTML = currentContent + currentTime;
          setDocumentContent(textareaRef.innerHTML);
        }
      }
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Time Inserted",
        description: `Current date and time inserted: ${currentTime}`,
        duration: 2000
      });
    } catch (error) {
      console.error('Insert time error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to insert current time",
        duration: 3000
      });
    }
  };
  const handleMore = () => toast({ title: "More Options", description: "Additional formatting options opened." });
  const applyTextFormatting = (formatType: 'paragraph' | 'heading1' | 'heading2') => {
    console.log("applyTextFormatting called with:", formatType);
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({ 
        title: "Select Text", 
        description: `Please select text to apply ${formatType} formatting`,
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    console.log("Selection:", { selectedText });
    
    if (!selectedText) {
      toast({ 
        title: "Select Text", 
        description: `Please select text to apply ${formatType} formatting`,
        duration: 3000
      });
      return;
    }

    let formattedHTML = '';
    
    switch (formatType) {
      case 'paragraph':
        formattedHTML = `<p style="font-size: 14px; margin: 4px 0;">${selectedText.toLowerCase()}</p>`;
        break;
      case 'heading1':
        formattedHTML = `<h1 style="font-size: 24px; font-weight: bold; margin: 8px 0; color: #1a1a1a;">${selectedText.toUpperCase()}</h1>`;
        break;
      case 'heading2':
        formattedHTML = `<h2 style="font-size: 18px; font-weight: bold; margin: 6px 0; color: #2a2a2a;">${selectedText.toUpperCase()}</h2>`;
        break;
    }
    
    // Create a new element from the formatted HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedHTML;
    const newElement = tempDiv.firstChild;
    
    // Replace the selected content with the new formatted element
    if (newElement) {
      range.deleteContents();
      range.insertNode(newElement);
      
      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    const titles = {
      paragraph: "✓ Paragraph",
      heading1: "✓ Heading 1", 
      heading2: "✓ Heading 2"
    };
    
    toast({ 
      title: titles[formatType],
      description: `${formatType} formatting applied successfully`,
      duration: 3000
    });
  };

  const handleParagraph = () => {
    console.log("handleParagraph called");
    applyTextFormatting('paragraph');
  };

  const handleH1 = () => {
    console.log("handleH1 called");
    applyTextFormatting('heading1');
  };

  const handleH2 = () => {
    console.log("handleH2 called");
    applyTextFormatting('heading2');
  };

  const applyFontFamily = (fontFamilyValue: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply font family",
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply font family",
        duration: 3000
      });
      return;
    }

    // Get the font family name for CSS with distinct fallbacks
    let fontFamilyCSS = '';
    switch (fontFamilyValue) {
      case 'arial':
        fontFamilyCSS = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
        break;
      case 'calibri':
        fontFamilyCSS = 'Calibri, "Trebuchet MS", "Lucida Grande", sans-serif';
        break;
      case 'cambria':
        fontFamilyCSS = 'Cambria, "Times New Roman", Georgia, serif';
        break;
      case 'comic-sans':
        fontFamilyCSS = '"Comic Sans MS", "Chalkboard SE", cursive';
        break;
      case 'verdana':
        fontFamilyCSS = 'Verdana, Geneva, "DejaVu Sans", sans-serif';
        break;
      case 'times':
        fontFamilyCSS = '"Times New Roman", Times, Georgia, serif';
        break;
      case 'courier':
        fontFamilyCSS = '"Courier New", Courier, "Lucida Console", monospace';
        break;
      default:
        fontFamilyCSS = 'Verdana, Geneva, "DejaVu Sans", sans-serif';
    }

    // Create a span with the font family applied
    const span = document.createElement('span');
    span.style.fontFamily = fontFamilyCSS;
    span.textContent = selectedText;
    
    // Replace the selected content with the new span
    range.deleteContents();
    range.insertNode(span);
    
    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    toast({ 
      title: "✓ Font Applied",
      description: `Font family changed to ${fontFamilyValue}`,
      duration: 2000
    });
  };

  const applyFontSize = (fontSizeValue: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply font size",
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) {
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply font size",
        duration: 3000
      });
      return;
    }

    // Create a span with the font size applied
    const span = document.createElement('span');
    span.style.fontSize = fontSizeValue;
    span.textContent = selectedText;
    
    // Replace the selected content with the new span
    range.deleteContents();
    range.insertNode(span);
    
    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    toast({ 
      title: "✓ Font Size Applied",
      description: `Font size changed to ${fontSizeValue}`,
      duration: 2000
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Scrollable Content Wrapper */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Header - exact match to Semble */}
        <div className="bg-white border-b border-gray-200 px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => toast({ title: "Letters", description: "Navigating back to letters list." })}>
              <ArrowLeft className="h-3 w-3 mr-1" />
              <span>Letters</span>
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-1 h-6" onClick={handlePreview}>
              Save and preview
            </Button>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={handleSaveAsDraft}>
              Save as draft
            </Button>
          </div>
          <div className="text-xs text-gray-600">Letter body</div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 cursor-pointer">Select Patient...</span>
            <span className="text-xs text-gray-600 cursor-pointer">New Chris...</span>
            <span className="text-xs text-gray-600 cursor-pointer">Share this...</span>
          </div>
        </div>
      </div>

      {/* Form Fields Section - Collapsible */}
      <div className="bg-gray-50 border-b border-gray-200">
        {/* Toggle Header */}
        <div className="px-4 py-2 flex items-center justify-between cursor-pointer" onClick={() => setShowFormFields(!showFormFields)}>
          <span className="text-sm font-medium text-gray-700">Letter Details</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {showFormFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Collapsible Content */}
        {showFormFields && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter recipient"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main-clinic">Main Clinic</SelectItem>
                    <SelectItem value="branch-office">Branch Office</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Copied in recipients (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter copied recipients"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Practitioner (optional)</label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select practitioner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                    <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
                    <SelectItem value="dr-brown">Dr. Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Header</label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Your Clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="your-clinic">Your Clinic</SelectItem>
                    <SelectItem value="main-hospital">Main Hospital</SelectItem>
                    <SelectItem value="specialty-center">Specialty Center</SelectItem>
                    <SelectItem value="urgent-care">Urgent Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Header Selection - Create the Letter */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Create the Letter</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2 text-center">Select Header</label>
            <Select value={selectedHeader} onValueChange={setSelectedHeader}>
              <SelectTrigger style={{ width: '700px' }}>
                <SelectValue placeholder="Your Clinic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="your-clinic">Your Clinic</SelectItem>
                <SelectItem value="main-hospital">Main Hospital</SelectItem>
                <SelectItem value="cardiology-dept">Cardiology Department</SelectItem>
                <SelectItem value="neurology-dept">Neurology Department</SelectItem>
                <SelectItem value="orthopedic-dept">Orthopedic Department</SelectItem>
                <SelectItem value="pediatrics-dept">Pediatrics Department</SelectItem>
                <SelectItem value="emergency-dept">Emergency Department</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Header Preview Area */}
          <div className="mt-4 p-6 bg-gray-50 border border-gray-200 rounded text-center relative" style={{ width: '700px' }}>
            {selectedHeader === "your-clinic" ? (
              <div>
                <div className="text-teal-600 text-lg font-semibold">🏥 {clinicInfo.name}</div>
                <div className="text-sm text-gray-600 mt-1">{clinicInfo.address}</div>
                <div className="text-sm text-gray-600">{clinicInfo.phone} • {clinicInfo.email}</div>
                <div className="text-sm text-gray-600">{clinicInfo.website}</div>
                
                {/* Edit Button */}
                <Dialog open={showEditClinic} onOpenChange={setShowEditClinic}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="absolute top-2 right-2"
                      onClick={() => setShowEditClinic(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Clinic Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Clinic Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="clinic-name">Clinic Name</Label>
                        <Input
                          id="clinic-name"
                          value={clinicInfo.name}
                          onChange={(e) => setClinicInfo(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter clinic name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clinic-address">Address</Label>
                        <Input
                          id="clinic-address"
                          value={clinicInfo.address}
                          onChange={(e) => setClinicInfo(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Enter clinic address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clinic-phone">Phone</Label>
                        <Input
                          id="clinic-phone"
                          value={clinicInfo.phone}
                          onChange={(e) => setClinicInfo(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clinic-email">Email</Label>
                        <Input
                          id="clinic-email"
                          value={clinicInfo.email}
                          onChange={(e) => setClinicInfo(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clinic-website">Website</Label>
                        <Input
                          id="clinic-website"
                          value={clinicInfo.website}
                          onChange={(e) => setClinicInfo(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="Enter website URL"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowEditClinic(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveClinicInfo}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div>
                <div className="text-teal-600 text-lg font-semibold">🏥 {selectedHeader.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                <div className="text-xs text-gray-500 mt-1">Header preview will appear here</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar - exact match to Semble with all visible options */}
      <div className="bg-white border-b border-gray-200 px-2 py-2 flex-shrink-0">
        {/* Main formatting row */}
        <div className="flex justify-center items-center gap-0.5 mb-2">
          {/* Font controls */}
          <Select value={textStyle} onValueChange={(value) => {
            console.log("Dropdown changed to:", value);
            setTextStyle(value);
            setTimeout(() => {
              if (value === "paragraph") handleParagraph();
              else if (value === "heading1") handleH1();
              else if (value === "heading2") handleH2();
            }, 100);
          }}>
            <SelectTrigger className="w-20 h-6 text-xs border border-gray-300">
              <SelectValue placeholder="H2" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="heading1">H1</SelectItem>
              <SelectItem value="heading2">H2</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={fontFamily} onValueChange={(value) => {
            setFontFamily(value);
            // Only apply font family if there's a valid selection
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
              applyFontFamily(value);
            }
          }}>
            <SelectTrigger className="w-24 h-7 text-sm border-2 border-gray-400 bg-white font-medium">
              <SelectValue placeholder="Verdana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arial">Arial</SelectItem>
              <SelectItem value="calibri">Calibri</SelectItem>
              <SelectItem value="cambria">Cambria</SelectItem>
              <SelectItem value="comic-sans">Comic Sans MS</SelectItem>
              <SelectItem value="times">Times New Roman</SelectItem>
              <SelectItem value="courier">Courier New</SelectItem>
              <SelectItem value="consolas">Consolas</SelectItem>
              <SelectItem value="courier">Courier New</SelectItem>
              <SelectItem value="franklin">Franklin Gothic</SelectItem>
              <SelectItem value="garamond">Garamond</SelectItem>
              <SelectItem value="georgia">Georgia</SelectItem>
              <SelectItem value="helvetica">Helvetica</SelectItem>
              <SelectItem value="impact">Impact</SelectItem>
              <SelectItem value="lato">Lato</SelectItem>
              <SelectItem value="lucida">Lucida Console</SelectItem>
              <SelectItem value="open-sans">Open Sans</SelectItem>
              <SelectItem value="palatino">Palatino</SelectItem>
              <SelectItem value="segoe">Segoe UI</SelectItem>
              <SelectItem value="tahoma">Tahoma</SelectItem>
              <SelectItem value="times">Times New Roman</SelectItem>
              <SelectItem value="trebuchet">Trebuchet MS</SelectItem>
              <SelectItem value="verdana">Verdana</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={fontSize} onValueChange={(value) => {
            setFontSize(value);
            // Only apply font size if there's a valid selection
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
              applyFontSize(value);
            }
          }}>
            <SelectTrigger className="w-16 h-7 text-sm border-2 border-gray-400 bg-white font-medium">
              <SelectValue placeholder="12pt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8pt">8pt</SelectItem>
              <SelectItem value="9pt">9pt</SelectItem>
              <SelectItem value="10pt">10pt</SelectItem>
              <SelectItem value="11pt">11pt</SelectItem>
              <SelectItem value="12pt">12pt</SelectItem>
              <SelectItem value="14pt">14pt</SelectItem>
              <SelectItem value="16pt">16pt</SelectItem>
              <SelectItem value="18pt">18pt</SelectItem>
              <SelectItem value="20pt">20pt</SelectItem>
              <SelectItem value="22pt">22pt</SelectItem>
              <SelectItem value="24pt">24pt</SelectItem>
              <SelectItem value="26pt">26pt</SelectItem>
              <SelectItem value="28pt">28pt</SelectItem>
              <SelectItem value="36pt">36pt</SelectItem>
              <SelectItem value="48pt">48pt</SelectItem>
              <SelectItem value="72pt">72pt</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="h-4 w-px bg-gray-300 mx-1"></div>
          
          {/* Text formatting - more visible */}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleBold}>
            <Bold className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleItalic}>
            <Italic className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleUnderline}>
            <Underline className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-gray-300 mx-1"></div>
          
          {/* Lists */}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleBulletList}>
            <List className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleNumberedList}>
            <ListOrdered className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-gray-300 mx-1"></div>
          
          {/* Alignment */}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleAlignLeft}>
            <AlignLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleAlignCenter}>
            <AlignCenter className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleAlignRight}>
            <AlignRight className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleAlignJustify}>
            <AlignJustify className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-gray-300 mx-1"></div>
          
          {/* Text color and tools */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={() => setShowColorPicker(!showColorPicker)}>
              <Type className="h-3 w-3" />
            </Button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 z-50">
                <div className="grid grid-cols-8 gap-1">
                  {[
                    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
                    '#808080', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0'
                  ].map((color) => (
                    <button
                      key={color}
                      className="w-4 h-4 border border-gray-300 rounded"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
                          toast({ 
                            title: "Select Text", 
                            description: "Please select text to apply color",
                            duration: 3000
                          });
                          setShowColorPicker(false);
                          return;
                        }

                        try {
                          // Apply text color using document.execCommand
                          document.execCommand('foreColor', false, color);
                          
                          // Update the document content state
                          if (textareaRef) {
                            setDocumentContent(textareaRef.innerHTML);
                          }
                          
                          setTextColor(color);
                          setShowColorPicker(false);
                          
                          toast({ 
                            title: "✓ Text Color Applied",
                            description: `Text color changed to ${color}`,
                            duration: 2000
                          });
                        } catch (error) {
                          console.error('Text color error:', error);
                          toast({ 
                            title: "Error", 
                            description: "Failed to apply text color",
                            duration: 3000
                          });
                          setShowColorPicker(false);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleHighlight}>
            <Highlighter className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-gray-300 mx-1"></div>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleClock}>
            <Clock className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleTable}>
            <Table className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleAttachFile}>
            <Paperclip className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleImage}>
            <Image className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleLink}>
            <Link className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-gray-200" onClick={handleMore}>
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {/* Medical data buttons row - more clearly visible */}
        <div className="flex justify-center items-center gap-1">
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handleInsertTemplate}>
            Insert template
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handleInsertLogo}>
            Insert logo
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handleClinic}>
            Clinic
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handlePatient}>
            Patient
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handleRecipient}>
            Recipient
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handleAppointments}>
            Appointments
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handleLabs}>
            Labs
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handlePatientRecords}>
            Patient records
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-5 px-2 border border-gray-300" onClick={handleInsertProduct}>
            Insert product
          </Button>
        </div>
      </div>

      {/* Document Editor - expandable page layout */}
      <div className="flex-1 bg-gray-100 overflow-y-auto min-h-0">
        <div className="h-full flex items-start justify-center p-4">
          <div className="bg-white shadow-sm border border-gray-300 min-h-[600px]" style={{ width: '700px', maxWidth: '700px' }}>
            <div className="p-6">
              <div
                ref={(el) => setTextareaRef(el as any)}
                contentEditable
                suppressContentEditableWarning={true}
                dangerouslySetInnerHTML={{ __html: documentContent || '' }}
                data-placeholder={documentContent ? '' : 'Start typing your document here...'}
                onInput={(e) => {
                  const content = (e.target as HTMLDivElement).innerHTML;
                  setDocumentContent(content);
                }}
                onClick={(e) => {
                  // Handle link clicks
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'A') {
                    e.preventDefault();
                    e.stopPropagation();
                    const href = target.getAttribute('href');
                    if (href) {
                      window.open(href, '_blank');
                    }
                  }
                }}
                className="w-full border-none outline-none text-black leading-normal bg-transparent focus:outline-none"
                style={{ 
                  fontSize: fontSize,
                  lineHeight: '1.6',
                  minHeight: '500px',
                  maxWidth: '100%',
                  fontFamily: fontFamily
                }}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Insert Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                className="w-full"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInsertLink}>
                Insert Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}