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
  Settings, FileText, Calculator, Search, ChevronDown, ChevronUp, Edit,
  User, Package, Save, TestTube
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
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [showClinicDialog, setShowClinicDialog] = useState(false);
  const [showEditClinicDialog, setShowEditClinicDialog] = useState(false);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [showAppointmentsDialog, setShowAppointmentsDialog] = useState(false);
  const [showLabsDialog, setShowLabsDialog] = useState(false);
  const [showPatientRecordsDialog, setShowPatientRecordsDialog] = useState(false);
  const [showInsertProductDialog, setShowInsertProductDialog] = useState(false);
  const [showMoreOptionsDialog, setShowMoreOptionsDialog] = useState(false);
  const [showSavedTemplatesDialog, setShowSavedTemplatesDialog] = useState(false);
  const [editingClinicInfo, setEditingClinicInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: ""
  });
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

  // Fetch saved templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/documents/templates"],
    queryFn: async () => {
      const response = await fetch('/api/documents?templates=true', {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
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

  // NUCLEAR OPTION: Force bluewave color on all toolbar buttons with data-bluewave attribute
  useEffect(() => {
    const timer = setTimeout(() => {
      const buttons = document.querySelectorAll('[data-bluewave="true"]');
      buttons.forEach((button: any) => {
        button.style.setProperty('background-color', '#4A7DFF', 'important');
        button.style.setProperty('border-color', '#4A7DFF', 'important');  
        button.style.setProperty('color', 'white', 'important');
        button.style.setProperty('border-width', '1px', 'important');
        button.style.setProperty('border-style', 'solid', 'important');
        // Remove any conflicting classes
        button.className = button.className.replace(/bg-\w+/g, '').replace(/border-\w+/g, '').replace(/text-\w+/g, '');
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
    console.log("🎯 handleItalic called!");
    
    const selection = window.getSelection();
    console.log("Selection object:", selection);
    
    if (!selection || selection.rangeCount === 0) {
      console.log("❌ No selection found");
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply italic formatting",
        duration: 3000
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    console.log("Selected text for italic:", selectedText);
    
    if (!selectedText) {
      console.log("❌ Empty selected text");
      toast({ 
        title: "Select Text", 
        description: "Please select text to apply italic formatting",
        duration: 3000
      });
      return;
    }

    try {
      // Create a span with italic styling
      const span = document.createElement('span');
      span.style.fontStyle = 'italic';
      span.textContent = selectedText;
      
      console.log("Created italic span:", span);
      
      // Replace the selected content with the new span
      range.deleteContents();
      range.insertNode(span);
      
      console.log("Inserted italic span successfully");
      
      // Update the document content state
      if (textareaRef) {
        const updatedContent = textareaRef.innerHTML;
        setDocumentContent(updatedContent);
        console.log("Updated content after italic:", updatedContent);
      }
      
      // Clear selection
      selection.removeAllRanges();
      
      toast({ 
        title: "✓ Italic Applied",
        description: "Italic formatting applied to selected text",
        duration: 2000
      });
    } catch (error) {
      console.error("Error in handleItalic:", error);
      toast({ 
        title: "Error",
        description: "Failed to apply italic formatting",
        duration: 3000
      });
    }
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
    const lines: string[] = [];
    
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
    const lines: string[] = [];
    
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
            <span style="display: inline-block; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 4px; padding: 4px 8px; margin: 0 2px; color: #0369a1; font-size: 12px; vertical-align: middle;">
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
  const handleInsertTemplate = () => {
    setShowTemplateDialog(true);
  };

  const insertTemplate = (templateText: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      // Create template content as HTML
      const templateDiv = document.createElement('div');
      templateDiv.innerHTML = templateText;
      templateDiv.style.marginBottom = '20px';

      // Insert template
      range.insertNode(templateDiv);
      
      // Move cursor after the template
      range.setStartAfter(templateDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowTemplateDialog(false);

      toast({
        title: "✓ Template Inserted",
        description: "Template has been added to your document",
        duration: 2000
      });

    } catch (error) {
      console.error('Template insertion error:', error);
      toast({
        title: "Error",
        description: "Failed to insert template",
        duration: 3000
      });
    }
  };
  const handleInsertLogo = () => {
    setShowLogoDialog(true);
  };

  const insertLogo = (logoType: string, logoData?: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let logoHTML = '';
      
      if (logoType === 'custom' && logoData) {
        // Custom uploaded logo
        logoHTML = `<div style="text-align: center; margin: 20px 0;"><img src="${logoData}" alt="Custom Logo" style="max-width: 200px; max-height: 100px; object-fit: contain;" /></div>`;
      } else {
        // Predefined clinic logos
        switch (logoType) {
          case 'clinic-modern':
            logoHTML = `<div style="text-align: center; margin: 20px 0; color: #0D9488; font-size: 24px; font-weight: bold;">🏥 ${clinicInfo.name || 'Healthcare Clinic'}</div>`;
            break;
          case 'clinic-professional':
            logoHTML = `<div style="text-align: center; margin: 20px 0; border: 2px solid #0D9488; padding: 15px; border-radius: 8px;"><div style="color: #0D9488; font-size: 20px; font-weight: bold;">${clinicInfo.name || 'Medical Center'}</div><div style="color: #666; font-size: 12px; margin-top: 5px;">Healthcare Excellence</div></div>`;
            break;
          case 'clinic-minimal':
            logoHTML = `<div style="text-align: center; margin: 20px 0; color: #1F2937; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">${clinicInfo.name || 'Medical Practice'}</div>`;
            break;
          case 'medical-cross':
            logoHTML = `<div style="text-align: center; margin: 20px 0;"><div style="display: inline-block; width: 60px; height: 60px; background: #DC2626; position: relative; margin-bottom: 10px;"><div style="position: absolute; top: 15px; left: 25px; width: 10px; height: 30px; background: white;"></div><div style="position: absolute; top: 25px; left: 15px; width: 30px; height: 10px; background: white;"></div></div><div style="color: #DC2626; font-size: 16px; font-weight: bold;">${clinicInfo.name || 'Medical Services'}</div></div>`;
            break;
          case 'health-plus':
            logoHTML = `<div style="text-align: center; margin: 20px 0;"><div style="color: #059669; font-size: 32px; margin-bottom: 8px;">⚕️</div><div style="color: #059669; font-size: 18px; font-weight: bold;">${clinicInfo.name || 'Health Plus'}</div></div>`;
            break;
        }
      }

      // Create logo element
      const logoDiv = document.createElement('div');
      logoDiv.innerHTML = logoHTML;

      // Insert logo
      range.insertNode(logoDiv);
      
      // Move cursor after the logo
      range.setStartAfter(logoDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowLogoDialog(false);

      toast({
        title: "✓ Logo Inserted",
        description: "Logo has been added to your document",
        duration: 2000
      });

    } catch (error) {
      console.error('Logo insertion error:', error);
      toast({
        title: "Error",
        description: "Failed to insert logo",
        duration: 3000
      });
    }
  };
  const handleClinic = () => {
    setShowClinicDialog(true);
  };

  const insertClinicInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let clinicHTML = '';
      
      switch (infoType) {
        case 'full-header':
          clinicHTML = `
            <div style="text-align: center; margin: 20px 0; padding: 15px; border-bottom: 2px solid #0D9488;">
              <h2 style="color: #0D9488; margin: 0; font-size: 24px; font-weight: bold;">${clinicInfo.name || 'Your Clinic Name'}</h2>
              <p style="margin: 5px 0; color: #666;">${clinicInfo.address || 'Clinic Address'}</p>
              <p style="margin: 5px 0; color: #666;">Phone: ${clinicInfo.phone || 'Phone Number'} | Email: ${clinicInfo.email || 'Email Address'}</p>
              <p style="margin: 5px 0; color: #666;">Website: ${clinicInfo.website || 'Website URL'}</p>
            </div>
          `;
          break;
        case 'name-only':
          clinicHTML = `<strong>${clinicInfo.name || 'Your Clinic Name'}</strong>`;
          break;
        case 'contact-info':
          clinicHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Contact Information:</strong></p>
              <p>Address: ${clinicInfo.address || 'Clinic Address'}</p>
              <p>Phone: ${clinicInfo.phone || 'Phone Number'}</p>
              <p>Email: ${clinicInfo.email || 'Email Address'}</p>
              <p>Website: ${clinicInfo.website || 'Website URL'}</p>
            </div>
          `;
          break;
        case 'letterhead':
          clinicHTML = `
            <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f8f9fa; border: 1px solid #e9ecef;">
              <h1 style="color: #0D9488; margin: 0; font-size: 28px; font-weight: bold;">${clinicInfo.name || 'Medical Center'}</h1>
              <p style="margin: 10px 0; color: #666; font-style: italic;">Excellence in Healthcare</p>
              <hr style="width: 50%; border: 1px solid #0D9488; margin: 15px auto;">
              <p style="margin: 5px 0; color: #333;">${clinicInfo.address || 'Address'}</p>
              <p style="margin: 5px 0; color: #333;">Tel: ${clinicInfo.phone || 'Phone'} | Email: ${clinicInfo.email || 'Email'}</p>
            </div>
          `;
          break;
        case 'signature-block':
          clinicHTML = `
            <div style="margin: 30px 0; padding: 15px; border-top: 1px solid #ccc;">
              <p><strong>${clinicInfo.name || 'Your Clinic Name'}</strong></p>
              <p>${clinicInfo.address || 'Clinic Address'}</p>
              <p>Phone: ${clinicInfo.phone || 'Phone Number'}</p>
              <p>Email: ${clinicInfo.email || 'Email Address'}</p>
            </div>
          `;
          break;
      }

      // Create clinic info element
      const clinicDiv = document.createElement('div');
      clinicDiv.innerHTML = clinicHTML;

      // Insert clinic info
      range.insertNode(clinicDiv);
      
      // Move cursor after the clinic info
      range.setStartAfter(clinicDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowClinicDialog(false);

      toast({
        title: "✓ Clinic Info Inserted",
        description: "Clinic information has been added to your document",
        duration: 2000
      });

    } catch (error) {
      console.error('Clinic info insertion error:', error);
      toast({
        title: "Error",
        description: "Failed to insert clinic information",
        duration: 3000
      });
    }
  };

  const handleEditClinicInfo = () => {
    // Initialize editing form with current clinic info
    setEditingClinicInfo({
      name: clinicInfo.name || "",
      address: clinicInfo.address || "",
      phone: clinicInfo.phone || "",
      email: clinicInfo.email || "",
      website: clinicInfo.website || ""
    });
    setShowEditClinicDialog(true);
  };

  const saveClinicInfo = () => {
    // Update clinic info state with edited values
    setClinicInfo({
      name: editingClinicInfo.name,
      address: editingClinicInfo.address,
      phone: editingClinicInfo.phone,
      email: editingClinicInfo.email,
      website: editingClinicInfo.website
    });

    // Close edit dialog
    setShowEditClinicDialog(false);

    toast({
      title: "✓ Clinic Information Updated",
      description: "Your clinic information has been saved successfully",
      duration: 2000
    });
  };

  const handlePatient = () => {
    setShowPatientDialog(true);
  };

  const insertPatientInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let patientHTML = '';
      
      switch (infoType) {
        case 'full-details':
          patientHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Patient Name:</strong> [Patient Name]</p>
              <p><strong>Date of Birth:</strong> [Date of Birth]</p>
              <p><strong>Patient ID:</strong> [Patient ID]</p>
              <p><strong>Address:</strong> [Patient Address]</p>
              <p><strong>Phone:</strong> [Patient Phone]</p>
              <p><strong>Email:</strong> [Patient Email]</p>
            </div>
          `;
          break;
        case 'name-dob':
          patientHTML = `<p><strong>Patient:</strong> [Patient Name] | <strong>DOB:</strong> [Date of Birth]</p>`;
          break;
        case 'contact-info':
          patientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Patient Contact Information:</strong></p>
              <p>Name: [Patient Name]</p>
              <p>Phone: [Patient Phone]</p>
              <p>Email: [Patient Email]</p>
              <p>Address: [Patient Address]</p>
            </div>
          `;
          break;
        case 'demographics':
          patientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Patient Demographics:</strong></p>
              <p>Name: [Patient Name]</p>
              <p>Age: [Patient Age]</p>
              <p>Gender: [Patient Gender]</p>
              <p>Date of Birth: [Date of Birth]</p>
              <p>Insurance: [Insurance Information]</p>
            </div>
          `;
          break;
        case 'emergency-contact':
          patientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Emergency Contact:</strong></p>
              <p>Name: [Emergency Contact Name]</p>
              <p>Relationship: [Relationship]</p>
              <p>Phone: [Emergency Contact Phone]</p>
            </div>
          `;
          break;
      }

      // Create patient info element
      const patientDiv = document.createElement('div');
      patientDiv.innerHTML = patientHTML;

      // Insert patient info
      range.insertNode(patientDiv);
      
      // Move cursor after the patient info
      range.setStartAfter(patientDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowPatientDialog(false);

      toast({
        title: "✓ Patient Info Inserted",
        description: "Patient information template has been added to your document",
        duration: 2000
      });

    } catch (error) {
      console.error('Patient info insertion error:', error);
      toast({
        title: "Error",
        description: "Failed to insert patient information",
        duration: 3000
      });
    }
  };
  const handleRecipient = () => {
    setShowRecipientDialog(true);
  };

  const insertRecipientInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let recipientHTML = '';
      
      switch (infoType) {
        case 'doctor-details':
          recipientHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Dr. [Doctor Name]</strong></p>
              <p>[Medical Specialty]</p>
              <p>[Clinic/Hospital Name]</p>
              <p>[Address]</p>
              <p>Phone: [Phone Number]</p>
              <p>Email: [Email Address]</p>
            </div>
          `;
          break;
        case 'specialist-referral':
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>To: Dr. [Specialist Name]</strong></p>
              <p>[Specialty Department]</p>
              <p>[Hospital/Clinic Name]</p>
              <p>Re: [Patient Name] - [Referral Reason]</p>
            </div>
          `;
          break;
        case 'insurance-company':
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>[Insurance Company Name]</strong></p>
              <p>Claims Department</p>
              <p>[Address]</p>
              <p>Policy Number: [Policy Number]</p>
              <p>Member ID: [Member ID]</p>
            </div>
          `;
          break;
        case 'patient-family':
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>[Family Member Name]</strong></p>
              <p>Relationship: [Relationship to Patient]</p>
              <p>[Address]</p>
              <p>Phone: [Phone Number]</p>
              <p>Email: [Email Address]</p>
            </div>
          `;
          break;
        case 'pharmacy':
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>[Pharmacy Name]</strong></p>
              <p>[Pharmacy Address]</p>
              <p>Phone: [Pharmacy Phone]</p>
              <p>Fax: [Pharmacy Fax]</p>
              <p>License: [Pharmacy License Number]</p>
            </div>
          `;
          break;
      }

      // Create recipient info element
      const recipientDiv = document.createElement('div');
      recipientDiv.innerHTML = recipientHTML;

      // Insert recipient info
      range.insertNode(recipientDiv);
      
      // Move cursor after the recipient info
      range.setStartAfter(recipientDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowRecipientDialog(false);

      toast({
        title: "✓ Recipient Info Inserted",
        description: "Recipient information template has been added to your document",
        duration: 2000
      });

    } catch (error) {
      console.error('Recipient info insertion error:', error);
      toast({
        title: "Error",
        description: "Failed to insert recipient information",
        duration: 3000
      });
    }
  };
  const handleAppointments = () => {
    setShowAppointmentsDialog(true);
  };

  const insertAppointmentInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let appointmentHTML = '';
      
      switch (infoType) {
        case 'appointment-details':
          appointmentHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Appointment Details</strong></p>
              <p>Date: [Appointment Date]</p>
              <p>Time: [Appointment Time]</p>
              <p>Duration: [Duration]</p>
              <p>Provider: Dr. [Provider Name]</p>
              <p>Department: [Department]</p>
              <p>Location: [Clinic Location]</p>
            </div>
          `;
          break;
        case 'next-appointment':
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Next Appointment:</strong></p>
              <p>Date: [Next Appointment Date]</p>
              <p>Time: [Next Appointment Time]</p>
              <p>Provider: Dr. [Provider Name]</p>
              <p>Purpose: [Appointment Purpose]</p>
            </div>
          `;
          break;
        case 'appointment-history':
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Recent Appointments:</strong></p>
              <p>• [Date 1] - Dr. [Provider 1] - [Purpose 1]</p>
              <p>• [Date 2] - Dr. [Provider 2] - [Purpose 2]</p>
              <p>• [Date 3] - Dr. [Provider 3] - [Purpose 3]</p>
            </div>
          `;
          break;
        case 'follow-up':
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Follow-up Appointment Required:</strong></p>
              <p>Recommended timeframe: [Timeframe]</p>
              <p>Purpose: [Follow-up Purpose]</p>
              <p>Please contact our office at [Phone Number] to schedule.</p>
            </div>
          `;
          break;
        case 'appointment-reminder':
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Appointment Reminder</strong></p>
              <p>You have an upcoming appointment:</p>
              <p>Date: [Appointment Date]</p>
              <p>Time: [Appointment Time]</p>
              <p>Provider: Dr. [Provider Name]</p>
              <p>Please arrive 15 minutes early and bring your insurance card and ID.</p>
            </div>
          `;
          break;
      }

      // Create appointment info element
      const appointmentDiv = document.createElement('div');
      appointmentDiv.innerHTML = appointmentHTML;

      // Insert appointment info
      range.insertNode(appointmentDiv);
      
      // Move cursor after the appointment info
      range.setStartAfter(appointmentDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowAppointmentsDialog(false);

      toast({
        title: "✓ Appointment Info Inserted",
        description: "Appointment information template has been added to your document",
        duration: 2000
      });

    } catch (error) {
      console.error('Appointment info insertion error:', error);
      toast({
        title: "Error",
        description: "Failed to insert appointment information",
        duration: 3000
      });
    }
  };
  const handleLabs = () => {
    setShowLabsDialog(true);
  };

  const insertLabInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let labHTML = '';
      
      switch (infoType) {
        case 'lab-results':
          labHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Laboratory Results</strong></p>
              <p>Date Collected: [Date Collected]</p>
              <p>Lab Name: [Laboratory Name]</p>
              <p>Test Type: [Test Type]</p>
              <p>Results: [Test Results]</p>
              <p>Reference Range: [Normal Range]</p>
              <p>Status: [Normal/Abnormal]</p>
            </div>
          `;
          break;
        case 'blood-work':
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Blood Work Results:</strong></p>
              <p>• CBC: [Complete Blood Count Results]</p>
              <p>• Glucose: [Glucose Level] mg/dL</p>
              <p>• Cholesterol: [Cholesterol Level] mg/dL</p>
              <p>• Hemoglobin: [Hemoglobin Level] g/dL</p>
              <p>Date: [Test Date]</p>
            </div>
          `;
          break;
        case 'urine-analysis':
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Urinalysis Results:</strong></p>
              <p>Color: [Color]</p>
              <p>Clarity: [Clarity]</p>
              <p>Protein: [Protein Level]</p>
              <p>Glucose: [Glucose Level]</p>
              <p>RBC: [Red Blood Cells]</p>
              <p>WBC: [White Blood Cells]</p>
            </div>
          `;
          break;
        case 'culture-results':
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Culture Results:</strong></p>
              <p>Specimen Type: [Specimen Type]</p>
              <p>Culture Result: [Culture Result]</p>
              <p>Organism: [Organism Identified]</p>
              <p>Sensitivity: [Antibiotic Sensitivity]</p>
              <p>Date Reported: [Report Date]</p>
            </div>
          `;
          break;
        case 'pending-labs':
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Pending Laboratory Tests:</strong></p>
              <p>• [Test Name 1] - Ordered: [Date 1]</p>
              <p>• [Test Name 2] - Ordered: [Date 2]</p>
              <p>• [Test Name 3] - Ordered: [Date 3]</p>
              <p>Expected Results: [Expected Date]</p>
            </div>
          `;
          break;
      }

      // Create lab info element
      const labDiv = document.createElement('div');
      labDiv.innerHTML = labHTML;

      // Insert lab info
      range.insertNode(labDiv);
      
      // Move cursor after the lab info
      range.setStartAfter(labDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog immediately
      setShowLabsDialog(false);

      // Small delay to ensure state update
      setTimeout(() => {
        toast({
          title: "✓ Lab Info Inserted",
          description: "Laboratory information template has been added to your document",
          duration: 2000
        });
      }, 100);

    } catch (error) {
      console.error('Lab info insertion error:', error);
      // Close dialog on error too
      setShowLabsDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert laboratory information",
        duration: 3000
      });
    }
  };
  const handlePatientRecords = () => {
    setShowPatientRecordsDialog(true);
  };

  const insertPatientRecordsInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let patientRecordsHTML = '';
      
      switch (infoType) {
        case 'medical-history':
          patientRecordsHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Medical History</strong></p>
              <p>Past Medical History: [Past Medical History]</p>
              <p>Surgical History: [Surgical History]</p>
              <p>Family History: [Family History]</p>
              <p>Social History: [Social History]</p>
              <p>Allergies: [Known Allergies]</p>
              <p>Current Medications: [Current Medications]</p>
            </div>
          `;
          break;
        case 'current-medications':
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Current Medications:</strong></p>
              <p>• [Medication 1] - [Dosage] - [Frequency]</p>
              <p>• [Medication 2] - [Dosage] - [Frequency]</p>
              <p>• [Medication 3] - [Dosage] - [Frequency]</p>
              <p>Last Updated: [Update Date]</p>
            </div>
          `;
          break;
        case 'allergies':
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Known Allergies:</strong></p>
              <p>Drug Allergies: [Drug Allergies]</p>
              <p>Food Allergies: [Food Allergies]</p>
              <p>Environmental Allergies: [Environmental Allergies]</p>
              <p>Reactions: [Allergic Reactions]</p>
              <p>Severity: [Severity Level]</p>
            </div>
          `;
          break;
        case 'vital-signs':
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Latest Vital Signs:</strong></p>
              <p>Blood Pressure: [Blood Pressure] mmHg</p>
              <p>Heart Rate: [Heart Rate] bpm</p>
              <p>Temperature: [Temperature]°F</p>
              <p>Respiratory Rate: [Respiratory Rate] breaths/min</p>
              <p>Weight: [Weight] lbs</p>
              <p>Height: [Height] ft/in</p>
              <p>Date Recorded: [Vital Signs Date]</p>
            </div>
          `;
          break;
        case 'diagnosis-history':
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Diagnosis History:</strong></p>
              <p>Primary Diagnosis: [Primary Diagnosis]</p>
              <p>Secondary Diagnoses: [Secondary Diagnoses]</p>
              <p>Chronic Conditions: [Chronic Conditions]</p>
              <p>Date of Diagnosis: [Diagnosis Date]</p>
              <p>ICD-10 Codes: [ICD-10 Codes]</p>
            </div>
          `;
          break;
      }

      // Create patient records info element
      const patientRecordsDiv = document.createElement('div');
      patientRecordsDiv.innerHTML = patientRecordsHTML;

      // Insert patient records info
      range.insertNode(patientRecordsDiv);
      
      // Move cursor after the patient records info
      range.setStartAfter(patientRecordsDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog immediately
      setShowPatientRecordsDialog(false);

      // Small delay to ensure state update
      setTimeout(() => {
        toast({
          title: "✓ Patient Records Inserted",
          description: "Patient records template has been added to your document",
          duration: 2000
        });
      }, 100);

    } catch (error) {
      console.error('Patient records insertion error:', error);
      // Close dialog on error too
      setShowPatientRecordsDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert patient records information",
        duration: 3000
      });
    }
  };
  const handleInsertProduct = () => {
    setShowInsertProductDialog(true);
  };

  const insertProductInfo = (productType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let productHTML = '';
      
      switch (productType) {
        case 'medication':
          productHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Medication Information</strong></p>
              <p>Product Name: [Medication Name]</p>
              <p>Generic Name: [Generic Name]</p>
              <p>Strength: [Strength/Dosage]</p>
              <p>Form: [Tablet/Capsule/Liquid/Injection]</p>
              <p>Manufacturer: [Manufacturer Name]</p>
              <p>NDC Number: [NDC Number]</p>
              <p>Price: £[Price]</p>
              <p>Instructions: [Dosage Instructions]</p>
            </div>
          `;
          break;
        case 'medical-device':
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Medical Device:</strong></p>
              <p>Device Name: [Device Name]</p>
              <p>Model Number: [Model Number]</p>
              <p>Manufacturer: [Manufacturer]</p>
              <p>Category: [Device Category]</p>
              <p>FDA Approval: [FDA Status]</p>
              <p>Price: £[Device Price]</p>
              <p>Warranty: [Warranty Period]</p>
            </div>
          `;
          break;
        case 'medical-supplies':
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Medical Supplies:</strong></p>
              <p>Supply Type: [Supply Type]</p>
              <p>Brand: [Brand Name]</p>
              <p>Quantity: [Quantity/Package Size]</p>
              <p>Unit Price: £[Unit Price]</p>
              <p>Total Price: £[Total Price]</p>
              <p>Sterility: [Sterile/Non-sterile]</p>
              <p>Expiration: [Expiration Date]</p>
            </div>
          `;
          break;
        case 'laboratory-test':
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Laboratory Test:</strong></p>
              <p>Test Name: [Test Name]</p>
              <p>Test Code: [CPT/Lab Code]</p>
              <p>Test Type: [Blood/Urine/Culture/Imaging]</p>
              <p>Processing Time: [Turnaround Time]</p>
              <p>Price: £[Test Price]</p>
              <p>Requirements: [Fasting/Special Instructions]</p>
            </div>
          `;
          break;
        case 'treatment-package':
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Treatment Package:</strong></p>
              <p>Package Name: [Treatment Package]</p>
              <p>Services Included: [Included Services]</p>
              <p>Duration: [Treatment Duration]</p>
              <p>Provider: [Healthcare Provider]</p>
              <p>Package Price: £[Package Price]</p>
              <p>Coverage: [Insurance Coverage]</p>
              <p>Follow-up: [Follow-up Included]</p>
            </div>
          `;
          break;
      }

      // Create product info element
      const productDiv = document.createElement('div');
      productDiv.innerHTML = productHTML;

      // Insert product info
      range.insertNode(productDiv);
      
      // Move cursor after the product info
      range.setStartAfter(productDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog immediately
      setShowInsertProductDialog(false);

      // Small delay to ensure state update
      setTimeout(() => {
        toast({
          title: "✓ Product Information Inserted",
          description: "Product details have been added to your document",
          duration: 2000
        });
      }, 100);

    } catch (error) {
      console.error('Product insertion error:', error);
      // Close dialog on error too
      setShowInsertProductDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert product information",
        duration: 3000
      });
    }
  };
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

    // Validate and fix URL format
    let validUrl = linkUrl.trim();
    
    // Add https:// if no protocol is specified
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    
    // Basic URL validation
    try {
      new URL(validUrl);
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
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
      link.href = validUrl;
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
  const handleMore = () => {
    setShowMoreOptionsDialog(true);
  };

  const loadTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/documents/${templateId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const template = await response.json();
      setDocumentContent(template.content);
      
      // Update the editor content
      if (textareaRef) {
        textareaRef.innerHTML = template.content;
      }

      toast({
        title: "✓ Template Loaded",
        description: `Template "${template.name}" loaded successfully`,
        duration: 3000
      });

      setShowTemplateDialog(false);
    } catch (error) {
      console.error('Template loading error:', error);
      toast({
        title: "Error",
        description: "Failed to load template. Please try again.",
        duration: 3000
      });
    }
  };

  const handleSave = async () => {
    try {
      if (!documentContent || documentContent.trim() === '') {
        toast({
          title: "Error",
          description: "Please create some content before saving",
          duration: 3000
        });
        return;
      }

      // Get current date for the document
      const now = new Date();
      const documentName = `Document_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      
      // Create template data
      const templateData = {
        name: documentName,
        content: documentContent,
        type: 'medical_form',
        isTemplate: true,
        metadata: {
          subject: 'Medical Form Template',
          recipient: 'Patient',
          location: clinicInfo.name || 'Clinic',
          practitioner: 'Dr. Provider',
          header: selectedHeader,
          templateUsed: 'Custom Form'
        }
      };

      // Save to database
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const savedTemplate = await response.json();

      toast({
        title: "✓ Template Saved",
        description: `Template saved successfully as "${documentName}" and is now available for reuse`,
        duration: 3000
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save document to database. Please try again.",
        duration: 3000
      });
    }
  };

  const handleMoreOption = (optionType: string) => {
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
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let optionHTML = '';
      
      switch (optionType) {
        case 'table':
          optionHTML = `
            <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">&nbsp;</th>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">&nbsp;</th>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">&nbsp;</th>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
              </tr>
            </table>
          `;
          break;
        case 'checkbox-list':
          optionHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Checklist:</strong></p>
              <div style="margin-left: 20px;">
                <input type="checkbox" style="margin-right: 8px;"> [Task 1]<br>
                <input type="checkbox" style="margin-right: 8px;"> [Task 2]<br>
                <input type="checkbox" style="margin-right: 8px;"> [Task 3]<br>
                <input type="checkbox" style="margin-right: 8px;"> [Task 4]<br>
              </div>
            </div>
          `;
          break;
        case 'horizontal-line':
          optionHTML = `<hr style="margin: 20px 0; border: 1px solid #ddd;">`;
          break;
        case 'date-time':
          const now = new Date();
          const dateTime = now.toLocaleString();
          optionHTML = `<p><strong>Date & Time:</strong> ${dateTime}</p>`;
          break;
        case 'signature-line':
          optionHTML = `
            <div style="margin: 30px 0;">
              <p>Signature: _________________________________</p>
              <p>Print Name: _________________________________</p>
              <p>Date: _________________________________</p>
            </div>
          `;
          break;
        case 'text-box':
          optionHTML = `
            <div style="border: 2px solid #ddd; padding: 15px; margin: 10px 0; background-color: #f9f9f9;">
              <p><strong>Important Note:</strong></p>
              <p>[Insert important information here]</p>
            </div>
          `;
          break;
      }

      const optionDiv = document.createElement('div');
      optionDiv.innerHTML = optionHTML;

      range.insertNode(optionDiv);
      range.setStartAfter(optionDiv);
      range.collapse(true);

      selection?.removeAllRanges();
      selection?.addRange(range);

      setDocumentContent(textareaRef.innerHTML);
      textareaRef.focus();

      setShowMoreOptionsDialog(false);

      setTimeout(() => {
        toast({
          title: "✓ Additional Option Inserted",
          description: `${optionType.replace('-', ' ')} has been added to your document`,
          duration: 2000
        });
      }, 100);

    } catch (error) {
      console.error('More option insertion error:', error);
      setShowMoreOptionsDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert additional option",
        duration: 3000
      });
    }
  };
  const applyTextFormatting = (formatType: 'paragraph' | 'heading1' | 'heading2') => {
    console.log("applyTextFormatting called with:", formatType);
    
    if (!textareaRef) {
      toast({
        title: "Editor Not Ready",
        description: "Please wait for the editor to load",
        duration: 2000
      });
      return;
    }

    const selection = window.getSelection();
    let selectedText = '';
    let range: Range | undefined;
    
    // Check if text is selected
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      selectedText = range.toString();
    }
    
    console.log("Selection:", { selectedText });
    
    // If no text selected, insert placeholder text at cursor
    if (!selectedText.trim()) {
      const placeholder = formatType === 'heading1' ? 'Heading 1' : formatType === 'heading2' ? 'Heading 2' : 'Paragraph text';
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create a range at the end of the content
        range = document.createRange();
        range.selectNodeContents(textareaRef);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      selectedText = placeholder;
    }

    // Create appropriate element based on format type
    let element: HTMLElement;
    
    // Get the current font family from the parent editor
    const currentFontFamily = textareaRef.style.fontFamily || fontFamily;
    
    switch (formatType) {
      case 'heading1':
        element = document.createElement('h1');
        element.style.setProperty('font-size', '24px', 'important');
        element.style.setProperty('font-weight', 'bold', 'important');
        element.style.setProperty('color', '#1a1a1a', 'important');
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('line-height', '1.2', 'important');
        element.style.setProperty('display', 'inline', 'important');
        element.style.setProperty('font-family', currentFontFamily, 'important');
        break;
      case 'heading2':
        element = document.createElement('h2');
        element.style.setProperty('font-size', '20px', 'important');
        element.style.setProperty('font-weight', 'bold', 'important');
        element.style.setProperty('color', '#2a2a2a', 'important');
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('line-height', '1.3', 'important');
        element.style.setProperty('display', 'inline', 'important');
        element.style.setProperty('font-family', currentFontFamily, 'important');
        break;
      default: // paragraph
        element = document.createElement('p');
        element.style.setProperty('font-size', '14px', 'important');
        element.style.setProperty('font-weight', 'normal', 'important');
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('line-height', '1.6', 'important');
        element.style.setProperty('display', 'inline', 'important');
        element.style.setProperty('font-family', currentFontFamily, 'important');
        break;
    }
    
    // Set text content
    element.textContent = selectedText;
    
    // Insert the new element
    if (range) {
      try {
        // Delete selected content if any
        if (selectedText !== (formatType === 'heading1' ? 'Heading 1' : formatType === 'heading2' ? 'Heading 2' : 'Paragraph text')) {
          range.deleteContents();
        }
        
        // Insert the new element
        range.insertNode(element);
        
        // Add a line break after the element for better formatting
        const br = document.createElement('br');
        range.setStartAfter(element);
        range.insertNode(br);
        
        // Position cursor after the new element
        range.setStartAfter(br);
        range.collapse(true);
        
        // Update selection
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        // Update document content
        setDocumentContent(textareaRef.innerHTML);
        
        // Focus the editor
        textareaRef.focus();
        
        const titles = {
          paragraph: "✓ Paragraph",
          heading1: "✓ Heading 1", 
          heading2: "✓ Heading 2"
        };
        
        toast({ 
          title: titles[formatType],
          description: `${formatType} formatting applied successfully`,
          duration: 2000
        });
        
      } catch (error) {
        console.error('Error applying text formatting:', error);
        toast({
          title: "Formatting Error",
          description: "Failed to apply text formatting. Please try again.",
          duration: 3000
        });
      }
    }
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

  const getFontFamilyCSS = (fontFamilyValue: string) => {
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
      case 'open-sans':
        fontFamilyCSS = '"Open Sans", "Helvetica Neue", Arial, sans-serif';
        break;
      case 'georgia':
        fontFamilyCSS = 'Georgia, "Times New Roman", serif';
        break;
      case 'helvetica':
        fontFamilyCSS = 'Helvetica, Arial, sans-serif';
        break;
      case 'consolas':
        fontFamilyCSS = 'Consolas, "Lucida Console", monospace';
        break;
      case 'franklin':
        fontFamilyCSS = '"Franklin Gothic Medium", Arial, sans-serif';
        break;
      case 'garamond':
        fontFamilyCSS = 'Garamond, "Times New Roman", serif';
        break;
      case 'impact':
        fontFamilyCSS = 'Impact, Arial Black, sans-serif';
        break;
      case 'lato':
        fontFamilyCSS = 'Lato, Arial, sans-serif';
        break;
      case 'lucida':
        fontFamilyCSS = '"Lucida Console", Consolas, monospace';
        break;
      case 'palatino':
        fontFamilyCSS = 'Palatino, "Times New Roman", serif';
        break;
      case 'segoe':
        fontFamilyCSS = '"Segoe UI", Arial, sans-serif';
        break;
      case 'tahoma':
        fontFamilyCSS = 'Tahoma, Arial, sans-serif';
        break;
      case 'trebuchet':
        fontFamilyCSS = '"Trebuchet MS", Arial, sans-serif';
        break;
      default:
        fontFamilyCSS = 'Verdana, Geneva, "DejaVu Sans", sans-serif';
    }
    return fontFamilyCSS;
  };

  // Map font values to CSS classes (avoiding inline styles)
  const getFontClass = (fontValue: string): string => {
    const fontClasses: Record<string, string> = {
      'arial': 'font-arial',
      'cambria': 'font-cambria',
      'courier': 'font-courier',
      'garamond': 'font-garamond',
      'comic-sans': 'font-comic-sans',
      'georgia': 'font-georgia',
      'helvetica': 'font-helvetica',
      'times': 'font-times',
      'trebuchet': 'font-trebuchet',
      'verdana': 'font-verdana',
      'tahoma': 'font-tahoma',
      'consolas': 'font-consolas',
      'lato': 'font-lato',
      'open-sans': 'font-open-sans',
      'franklin': 'font-franklin'
    };
    
    return fontClasses[fontValue] || 'font-arial';
  };

  const applyFontFamily = (fontFamilyValue: string) => {
    console.log("applyFontFamily called with:", fontFamilyValue);
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, insert sample text
      const placeholder = `Sample text in ${fontFamilyValue}`;
      if (textareaRef) {
        textareaRef.focus();
        const content = textareaRef.value;
        const newContent = content + (content.endsWith('\n') ? '' : '\n') + placeholder;
        textareaRef.value = newContent;
        setDocumentContent(newContent);
        
        toast({ 
          title: "✓ Font Applied",
          description: `Font family changed to ${fontFamilyValue} with sample text`,
          duration: 2000
        });
      }
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    console.log("Font family selection:", { selectedText, fontFamilyValue });
    
    if (!selectedText) {
      // No text selected, insert sample text at cursor
      const placeholder = `Sample text in ${fontFamilyValue}`;
      const textNode = document.createTextNode(placeholder);
      range.insertNode(textNode);
      
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
      
      toast({ 
        title: "✓ Font Applied",
        description: `Font family changed to ${fontFamilyValue} with sample text`,
        duration: 2000
      });
      return;
    }

    // Get the font family name for CSS with distinct fallbacks
    const fontFamilyCSS = getFontFamilyCSS(fontFamilyValue);

    try {
      // Check if selection is within an existing font-family span
      const startContainer = range.startContainer;
      const parentElement = startContainer.nodeType === Node.TEXT_NODE 
        ? startContainer.parentElement 
        : startContainer;
      
      // Look for an existing font-family span that contains our selection
      let existingFontSpan = null;
      let current = parentElement;
      while (current && current !== textareaRef) {
        if (current instanceof HTMLElement && current.style && current.style.fontFamily) {
          // Check if this span completely contains our selection
          const spanText = current.textContent || '';
          const selectionText = selectedText;
          if (spanText === selectionText || spanText.includes(selectionText)) {
            existingFontSpan = current;
            break;
          }
        }
        current = current.parentElement;
      }
      
      if (existingFontSpan) {
        // Update existing span's font family instead of creating nested span
        const fontClass = getFontClass(fontFamilyValue);
        existingFontSpan.className = fontClass;
        existingFontSpan.removeAttribute('style');
        existingFontSpan.removeAttribute('data-font-family');
        console.log("Updated existing span with class:", fontClass);
      } else {
        // Create a new span with the font family applied
        const span = document.createElement('span');
        const fontClass = getFontClass(fontFamilyValue);
        span.className = fontClass;
        span.textContent = selectedText;
        
        // Replace the selected content with the new span
        range.deleteContents();
        range.insertNode(span);
        console.log("Created new font span with class:", fontClass);
      }
      
      console.log("Applied font class:", { fontClass: getFontClass(fontFamilyValue), selectedText });
      
      // Update the document content state from the contentEditable div
      if (textareaRef) {
        const updatedContent = textareaRef.innerHTML;
        setDocumentContent(updatedContent);
        console.log("Updated content:", updatedContent);
      }
      
      // Clear selection and refocus
      selection.removeAllRanges();
      if (textareaRef) {
        textareaRef.focus();
      }
      
      toast({ 
        title: "✓ Font Applied",
        description: `Font family changed to ${fontFamilyValue}`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error applying font family:', error);
      toast({ 
        title: "Error",
        description: `Failed to apply font family`,
        duration: 3000
      });
    }
  };

  const applyFontSize = (fontSizeValue: string) => {
    const selection = window.getSelection();
    let selectedText = '';
    let range: Range | undefined;
    
    // Check if text is selected
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      selectedText = range.toString();
    }
    
    // If no text selected, create sample text with font size
    if (!selectedText) {
      const placeholder = `Sample text at ${fontSizeValue}`;
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        selectedText = placeholder;
      } else if (textareaRef) {
        // Insert at cursor or end of document
        textareaRef.focus();
        const content = textareaRef.value;
        const newContent = content + (content.endsWith('\n') ? '' : '\n') + placeholder;
        textareaRef.value = newContent;
        setDocumentContent(newContent);
        
        toast({ 
          title: "✓ Font Size Applied",
          description: `Font size changed to ${fontSizeValue} with sample text`,
          duration: 2000
        });
        return;
      } else {
        selectedText = placeholder;
      }
    }

    // Create a span with the font size applied
    const span = document.createElement('span');
    span.className = 'custom-font-override';
    span.setAttribute('style', `font-size: ${fontSizeValue} !important;`);
    span.textContent = selectedText;
    
    // Replace the selected content with the new span
    if (range) {
      range.deleteContents();
      range.insertNode(span);
    } else if (textareaRef) {
      textareaRef.innerHTML += span.outerHTML;
    }
    
    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }
    
    // Clear selection
    selection?.removeAllRanges();
    
    toast({ 
      title: "✓ Font Size Applied",
      description: `Font size changed to ${fontSizeValue}`,
      duration: 2000
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-[hsl(var(--cura-midnight))]">
      {/* Page Shell Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex-1 overflow-y-auto">
        {/* Header Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          {/* Left - Title and Navigation */}
          <div className="flex items-center gap-4">
            <Button 
              className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2"
              style={{ 
                backgroundColor: '#4A7DFF', 
                color: 'white',
                borderColor: '#4A7DFF',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(74,125,255,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7279FB';
                e.currentTarget.style.borderColor = '#7279FB';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(114,121,251,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4A7DFF';
                e.currentTarget.style.borderColor = '#4A7DFF';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,125,255,0.3)';
              }}
              onClick={() => toast({ title: "Letters", description: "Navigating back to letters list." })}
              data-testid="button-back-letters"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Letters</span>
            </Button>
          </div>
          
          {/* Right - Primary Actions */}
          <div className="flex items-center gap-4">
            <Button 
              className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2"
              style={{ 
                backgroundColor: '#7279FB', 
                color: 'white',
                borderColor: '#7279FB',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(114,121,251,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4A7DFF';
                e.currentTarget.style.borderColor = '#4A7DFF';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(74,125,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#7279FB';
                e.currentTarget.style.borderColor = '#7279FB';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(114,121,251,0.3)';
              }}
              onClick={handlePreview}
              data-testid="button-save-preview"
            >
              Save and preview
            </Button>
            <Button 
              className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2"
              style={{ 
                backgroundColor: '#4A7DFF', 
                color: 'white',
                borderColor: '#4A7DFF',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(74,125,255,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7279FB';
                e.currentTarget.style.borderColor = '#7279FB';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(114,121,251,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4A7DFF';
                e.currentTarget.style.borderColor = '#4A7DFF';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,125,255,0.3)';
              }}
              onClick={handleSaveAsDraft}
              data-testid="button-save-draft"
            >
              Save as draft
            </Button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 gap-4">
          {/* Editor Column */}
          <div className="lg:col-span-8 space-y-4" data-testid="editor-column">
            
            {/* Form Fields Section - Collapsible */}
            <div className="bg-white dark:bg-[hsl(var(--cura-midnight))] border border-gray-200 dark:border-[hsl(var(--cura-steel))] rounded-md" data-testid="form-fields-section">
        {/* Toggle Header */}
        <div className="px-4 py-2 flex items-center justify-between cursor-pointer" onClick={() => setShowFormFields(!showFormFields)}>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Letter Details</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
            {showFormFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Collapsible Content */}
        {showFormFields && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[hsl(var(--cura-steel))] dark:border-[hsl(var(--cura-steel))] bg-white dark:bg-[hsl(var(--cura-midnight))] text-[hsl(var(--cura-midnight))] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--cura-bluewave))]"
                  placeholder="Enter subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-1">Recipient (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[hsl(var(--cura-steel))] dark:border-[hsl(var(--cura-steel))] bg-white dark:bg-[hsl(var(--cura-midnight))] text-[hsl(var(--cura-midnight))] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--cura-bluewave))]"
                  placeholder="Enter recipient"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-1">Location (optional)</label>
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
                <label className="block text-sm font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-1">Copied in recipients (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[hsl(var(--cura-steel))] dark:border-[hsl(var(--cura-steel))] bg-white dark:bg-[hsl(var(--cura-midnight))] text-[hsl(var(--cura-midnight))] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--cura-bluewave))]"
                  placeholder="Enter copied recipients"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-1">Practitioner (optional)</label>
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
                <label className="block text-sm font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-1">Select Header</label>
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

            {/* Sticky Grouped Toolbar */}
            <div className="sticky top-0 z-40 bg-white dark:bg-[hsl(var(--cura-midnight))] border-y border-gray-200 dark:border-[hsl(var(--cura-steel))] px-4 py-3 shadow-sm" data-testid="sticky-toolbar">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                
                {/* Formatting Group */}
                <div className="flex items-center gap-1 border-r border-gray-200 dark:border-[hsl(var(--cura-steel))] pr-3 mr-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">Format:</span>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-bold">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-italic">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-underline">
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>

                {/* Insert Group */}
                <div className="flex items-center gap-1 border-r border-gray-200 dark:border-[hsl(var(--cura-steel))] pr-3 mr-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">Insert:</span>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-insert-patient" onClick={() => setShowPatientDialog(true)}>
                    <User className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Patient</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-insert-link" onClick={() => setShowLinkDialog(true)}>
                    <Link className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Link</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-insert-product" onClick={() => setShowInsertProductDialog(true)}>
                    <Package className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Product</span>
                  </Button>
                </div>

                {/* Template Group */}
                <div className="flex items-center gap-1 border-r border-gray-200 dark:border-[hsl(var(--cura-steel))] pr-3 mr-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">Template:</span>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-load-template" onClick={() => setShowSavedTemplatesDialog(true)}>
                    <FileText className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Load</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-save-template" onClick={() => setShowTemplateDialog(true)}>
                    <Save className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                </div>

                {/* Medical Group */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">Medical:</span>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-insert-labs" onClick={() => setShowLabsDialog(true)}>
                    <TestTube className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Labs</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-insert-records" onClick={() => setShowPatientRecordsDialog(true)}>
                    <FileText className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Records</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[hsl(var(--cura-steel))]" data-testid="button-more-options" onClick={() => setShowMoreOptionsDialog(true)}>
                    <MoreHorizontal className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">More</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Clinical Header Selection - Create the Letter */}
            <div className="bg-white dark:bg-[hsl(var(--cura-midnight))] border-b border-[hsl(var(--cura-steel))] dark:border-[hsl(var(--cura-steel))] px-4 py-4" data-testid="clinical-header-section">
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-3">Create the Letter</h3>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--cura-midnight))] dark:text-white mb-2 text-center">Select Header</label>
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
          <div className="mt-4 p-6 bg-blue-50 dark:bg-[hsl(var(--cura-midnight))] border border-blue-200 dark:border-[hsl(var(--cura-steel))] rounded text-center relative" style={{ width: '700px' }}>
            {selectedHeader === "your-clinic" ? (
              <div>
                <div className="text-[hsl(var(--cura-bluewave))] dark:text-[hsl(var(--cura-bluewave))] text-lg font-semibold">🏥 {clinicInfo.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{clinicInfo.address}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{clinicInfo.phone} • {clinicInfo.email}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{clinicInfo.website}</div>
                
                {/* Edit Button */}
                <Dialog open={showEditClinic} onOpenChange={setShowEditClinic}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="sm" 
                      className="absolute top-2 right-2 border transition-all duration-200"
                      style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
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
                        <Button variant="ghost" className="border transition-all duration-200" 
                          style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                          onClick={() => setShowEditClinic(false)}>
                          Cancel
                        </Button>
                        <Button variant="ghost" className="border transition-all duration-200" 
                          style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                          onClick={handleSaveClinicInfo}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div>
                <div className="text-[hsl(var(--cura-bluewave))] dark:text-[hsl(var(--cura-bluewave))] text-lg font-semibold">🏥 {selectedHeader.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">Header preview will appear here</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar - medical theme colors */}
      <div className="bg-white dark:bg-[hsl(var(--cura-midnight))] border-b border-[hsl(var(--cura-steel))] dark:border-[hsl(var(--cura-steel))] px-2 py-2 flex-shrink-0">
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
            <SelectTrigger data-bluewave="true" className="w-20 h-6 text-xs">
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
            
            // Apply font to editor for new text
            if (textareaRef) {
              const fontFamilyCSS = getFontFamilyCSS(value);
              textareaRef.style.fontFamily = fontFamilyCSS;
            }
            
            // Also apply font family to selected text if any exists
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
              applyFontFamily(value);
            }
          }}>
            <SelectTrigger data-bluewave="true" className="w-24 h-5 text-xs">
              <SelectValue placeholder="Verdana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arial">Arial</SelectItem>
              <SelectItem value="calibri">Calibri</SelectItem>
              <SelectItem value="cambria">Cambria</SelectItem>
              <SelectItem value="comic-sans">Comic Sans MS</SelectItem>
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
            <SelectTrigger data-bluewave="true" className="w-16 h-5 text-xs">
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
          
          <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>
          
          {/* Text formatting - more visible */}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleBold}>
            <Bold className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#7279FB', 
              borderColor: '#7279FB',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onClick={handleItalic}>
            <Italic className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleUnderline}>
            <Underline className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>
          
          {/* Lists */}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#7279FB', 
              borderColor: '#7279FB',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onClick={handleBulletList}>
            <List className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleNumberedList}>
            <ListOrdered className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>
          
          {/* Alignment */}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#7279FB', 
              borderColor: '#7279FB',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onClick={handleAlignLeft}>
            <AlignLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleAlignCenter}>
            <AlignCenter className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#7279FB', 
              borderColor: '#7279FB',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onClick={handleAlignRight}>
            <AlignRight className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleAlignJustify}>
            <AlignJustify className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>
          
          {/* Text color and tools */}
          <div className="relative">
            <Button data-bluewave="true" size="sm" className="h-6 w-6 p-0" 
              onClick={() => setShowColorPicker(!showColorPicker)}>
              <Type className="h-3 w-3" />
            </Button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[hsl(var(--cura-midnight))] border border-[hsl(var(--cura-steel))] dark:border-[hsl(var(--cura-steel))] rounded shadow-lg p-2 z-50">
                <div className="grid grid-cols-8 gap-1">
                  {[
                    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
                    '#808080', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0'
                  ].map((color) => (
                    <button
                      key={color}
                      className="w-4 h-4 border border-[hsl(var(--cura-steel))] rounded"
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
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleHighlight}>
            <Highlighter className="h-3 w-3" />
          </Button>
          
          <div className="h-4 w-px bg-[hsl(var(--cura-steel))] mx-1"></div>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#7279FB', 
              borderColor: '#7279FB',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onClick={handleClock}>
            <Clock className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleTable}>
            <Table className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#7279FB', 
              borderColor: '#7279FB',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onClick={handleAttachFile}>
            <Paperclip className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#4A7DFF', 
              borderColor: '#4A7DFF',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onClick={handleImage}>
            <Image className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border transition-all duration-200" 
            style={{ 
              backgroundColor: '#7279FB', 
              borderColor: '#7279FB',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4A7DFF';
              e.currentTarget.style.borderColor = '#4A7DFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7279FB';
              e.currentTarget.style.borderColor = '#7279FB';
            }}
            onClick={handleLink}>
            <Link className="h-3 w-3" />
          </Button>
          <Button data-bluewave="true" size="sm" className="h-6 w-6 p-0" 
            onClick={handleMore}>
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {/* Medical data buttons row - medical theme colors */}
        <div className="flex justify-center items-center gap-1">
          <Button 
            data-bluewave="true"
            size="sm" className="text-xs h-5 px-2" 
            onClick={handleInsertTemplate}>
            Insert template
          </Button>
          <Button 
            data-bluewave="true"
            size="sm" className="text-xs h-5 px-2" 
            onClick={handleInsertLogo}>
            Insert logo
          </Button>
          <Button 
            data-bluewave="true"
            size="sm" className="text-xs h-5 px-2" 
            onClick={handleClinic}>
            Clinic
          </Button>
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={handlePatient}>
            Patient
          </Button>
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={handleRecipient}>
            Recipient
          </Button>
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={handleAppointments}>
            Appointments
          </Button>
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={handleLabs}>
            Labs
          </Button>
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={handlePatientRecords}>
            Patient records
          </Button>
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={handleInsertProduct}>
            Insert product
          </Button>
        </div>
        
        {/* Save and View buttons - medical theme colors */}
        <div className="flex justify-center items-center gap-1">
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={handleSave}>
            Save Template
          </Button>
          <Button data-bluewave="true" size="sm" className="text-xs h-5 px-2" onClick={() => setShowSavedTemplatesDialog(true)}>
            View Saved Templates
          </Button>
        </div>
      </div>

            {/* Enhanced Document Editor Canvas */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[hsl(var(--cura-midnight))] dark:to-[hsl(var(--cura-steel))] overflow-y-auto min-h-0 rounded-lg" data-testid="editor-canvas-container">
              <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white dark:bg-[hsl(var(--cura-midnight))] shadow-xl border border-gray-200 dark:border-[hsl(var(--cura-steel))] rounded-xl transition-all duration-300 hover:shadow-2xl focus-within:shadow-2xl focus-within:ring-2 focus-within:ring-[hsl(var(--cura-bluewave))]/20" 
                     style={{ minHeight: '700px', maxWidth: '21cm', margin: '0 auto' }}
                     data-testid="editor-canvas">
                  
                  {/* Editor Container with A4 Paper Simulation */}
                  <div className="relative">
                    {/* Paper Guidelines (subtle) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50/30 to-transparent dark:via-[hsl(var(--cura-steel))]/20 pointer-events-none rounded-xl"></div>
                    
                    {/* Content Area */}
                    <div className="relative p-8 sm:p-12" data-testid="editor-content-area">
                      <div
                        ref={(el) => {
                          setTextareaRef(el as any);
                          if (el && documentContent && el.innerHTML !== documentContent) {
                            el.innerHTML = documentContent;
                          }
                        }}
                        contentEditable
                        suppressContentEditableWarning={true}
                        data-placeholder={documentContent ? '' : 'Start typing your document here...'}
                        onInput={(e) => {
                          const content = (e.target as HTMLDivElement).innerHTML;
                          setDocumentContent(content);
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.outline = '2px solid hsl(var(--cura-bluewave))';
                          e.currentTarget.style.outlineOffset = '4px';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.outline = 'none';
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
                        className="w-full border-none outline-none text-[hsl(var(--cura-midnight))] dark:text-white leading-relaxed bg-transparent focus:outline-none transition-all duration-200 prose prose-lg dark:prose-invert max-w-none
                                 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-gray-500 empty:before:italic empty:before:pointer-events-none"
                        style={{ 
                          fontSize: fontSize,
                          lineHeight: '1.75',
                          minHeight: '600px',
                          maxWidth: '100%',
                          fontFamily: fontFamily,
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                        data-testid="editor-textarea"
                      />
            </div>
          </div>
        </div>
          </div>

          {/* Right Sidebar Column - Will be implemented later */}
          <div className="lg:col-span-4" data-testid="right-sidebar">
            {/* Placeholder for sidebar content */}
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
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={handleInsertLink}>
                Insert Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Saved Templates */}
              {templates && templates.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Saved Templates</h3>
                  <div className="space-y-2">
                    {templates.map((template: any) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        className="w-full text-left justify-start h-auto p-4"
                        onClick={() => loadTemplate(template.id)}
                      >
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-500">
                            Created: {new Date(template.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Letter Templates */}
              <div>
                <h3 className="font-semibold mb-2">Medical Letter Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertTemplate(`
                      <h2 style="font-size: 18px; font-weight: bold; margin: 6px 0;">Referral Letter</h2>
                      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                      <p><strong>Dear Colleague,</strong></p>
                      <p>I am writing to refer <strong>[Patient Name]</strong> for your expert opinion and management.</p>
                      <p><strong>Clinical History:</strong><br>[Enter clinical history here]</p>
                      <p><strong>Current Medications:</strong><br>[Enter current medications]</p>
                      <p><strong>Examination Findings:</strong><br>[Enter examination findings]</p>
                      <p><strong>Reason for Referral:</strong><br>[Enter reason for referral]</p>
                      <p>Thank you for your assistance in the care of this patient.</p>
                      <p>Yours sincerely,<br><br><strong>[Your Name]</strong><br>[Your Title]</p>
                    `)}
                  >
                    <div>
                      <div className="font-medium">Referral Letter</div>
                      <div className="text-sm text-gray-500">Standard medical referral template</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertTemplate(`
                      <h2 style="font-size: 18px; font-weight: bold; margin: 6px 0;">Discharge Summary</h2>
                      <p><strong>Date of Admission:</strong> [Date]</p>
                      <p><strong>Date of Discharge:</strong> ${new Date().toLocaleDateString()}</p>
                      <p><strong>Patient:</strong> [Patient Name]</p>
                      <p><strong>Admission Diagnosis:</strong><br>[Enter admission diagnosis]</p>
                      <p><strong>Discharge Diagnosis:</strong><br>[Enter discharge diagnosis]</p>
                      <p><strong>Treatment Received:</strong><br>[Enter treatment details]</p>
                      <p><strong>Medications on Discharge:</strong><br>[Enter discharge medications]</p>
                      <p><strong>Follow-up Instructions:</strong><br>[Enter follow-up instructions]</p>
                      <p><strong>GP Actions Required:</strong><br>[Enter GP actions if any]</p>
                    `)}
                  >
                    <div>
                      <div className="font-medium">Discharge Summary</div>
                      <div className="text-sm text-gray-500">Hospital discharge summary template</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertTemplate(`
                      <h2 style="font-size: 18px; font-weight: bold; margin: 6px 0;">Medical Certificate</h2>
                      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                      <p><strong>Patient Name:</strong> [Patient Name]</p>
                      <p><strong>Date of Birth:</strong> [DOB]</p>
                      <p>I certify that I examined the above named patient on <strong>${new Date().toLocaleDateString()}</strong></p>
                      <p><strong>Clinical Findings:</strong><br>[Enter clinical findings]</p>
                      <p><strong>Diagnosis:</strong><br>[Enter diagnosis]</p>
                      <p><strong>Fitness for Work:</strong><br>☐ Fit for normal duties<br>☐ Fit for light duties<br>☐ Unfit for work</p>
                      <p><strong>Period:</strong> From [Date] to [Date]</p>
                      <p><strong>Additional Comments:</strong><br>[Enter any additional comments]</p>
                      <p><br><strong>Dr. [Name]</strong><br>Medical Practitioner<br>Registration No: [Number]</p>
                    `)}
                  >
                    <div>
                      <div className="font-medium">Medical Certificate</div>
                      <div className="text-sm text-gray-500">Fitness for work certificate</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* General Templates */}
              <div>
                <h3 className="font-semibold mb-2">General Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertTemplate(`
                      <h2 style="font-size: 18px; font-weight: bold; margin: 6px 0;">Appointment Confirmation</h2>
                      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                      <p>Dear [Patient Name],</p>
                      <p>This letter confirms your upcoming appointment:</p>
                      <p><strong>Date:</strong> [Appointment Date]<br>
                      <strong>Time:</strong> [Appointment Time]<br>
                      <strong>Location:</strong> [Clinic Address]<br>
                      <strong>Provider:</strong> [Doctor Name]</p>
                      <p><strong>Please bring:</strong><br>• Photo ID<br>• Insurance card<br>• List of current medications<br>• Previous test results (if applicable)</p>
                      <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
                      <p>We look forward to seeing you.</p>
                      <p>Best regards,<br>[Clinic Name]</p>
                    `)}
                  >
                    <div>
                      <div className="font-medium">Appointment Confirmation</div>
                      <div className="text-sm text-gray-500">Patient appointment confirmation</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertTemplate(`
                      <h2 style="font-size: 18px; font-weight: bold; margin: 6px 0;">Treatment Plan</h2>
                      <p><strong>Patient:</strong> [Patient Name]</p>
                      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                      <p><strong>Diagnosis:</strong> [Primary Diagnosis]</p>
                      <p><strong>Treatment Goals:</strong></p>
                      <ul style="margin-left: 20px; list-style-type: disc;">
                        <li>[Goal 1]</li>
                        <li>[Goal 2]</li>
                        <li>[Goal 3]</li>
                      </ul>
                      <p><strong>Treatment Plan:</strong></p>
                      <ol style="margin-left: 20px; list-style-type: decimal;">
                        <li><strong>Medications:</strong> [Specify medications and dosages]</li>
                        <li><strong>Therapy:</strong> [Specify therapy type and frequency]</li>
                        <li><strong>Lifestyle Modifications:</strong> [Specify recommendations]</li>
                        <li><strong>Follow-up:</strong> [Specify follow-up schedule]</li>
                      </ol>
                      <p><strong>Next Review:</strong> [Date]</p>
                    `)}
                  >
                    <div>
                      <div className="font-medium">Treatment Plan</div>
                      <div className="text-sm text-gray-500">Comprehensive treatment planning template</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logo Selection Dialog */}
      <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Predefined Logo Options */}
              <div>
                <h3 className="font-semibold mb-2">Clinic Logo Templates</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo('clinic-modern')}
                  >
                    <div className="text-2xl mb-2 text-teal-600">🏥</div>
                    <div className="text-sm font-medium">Modern Clinic</div>
                    <div className="text-xs text-gray-500">Icon with clinic name</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo('clinic-professional')}
                  >
                    <div className="w-full h-12 border-2 border-teal-600 rounded flex items-center justify-center mb-2">
                      <div className="text-xs font-bold text-teal-600">MEDICAL</div>
                    </div>
                    <div className="text-sm font-medium">Professional</div>
                    <div className="text-xs text-gray-500">Boxed design</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo('clinic-minimal')}
                  >
                    <div className="text-sm font-bold uppercase tracking-wider mb-2">PRACTICE</div>
                    <div className="text-sm font-medium">Minimal</div>
                    <div className="text-xs text-gray-500">Clean typography</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo('medical-cross')}
                  >
                    <div className="w-8 h-8 bg-red-600 relative mb-2">
                      <div className="absolute top-2 left-3 w-2 h-4 bg-white"></div>
                      <div className="absolute top-3 left-2 w-4 h-2 bg-white"></div>
                    </div>
                    <div className="text-sm font-medium">Medical Cross</div>
                    <div className="text-xs text-gray-500">Classic red cross</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo('health-plus')}
                  >
                    <div className="text-2xl mb-2 text-green-600">⚕️</div>
                    <div className="text-sm font-medium">Health Plus</div>
                    <div className="text-xs text-gray-500">Medical symbol</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => {
                      // Create file input for custom logo upload
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
                            insertLogo('custom', imageData);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      
                      document.body.appendChild(input);
                      input.click();
                      document.body.removeChild(input);
                    }}
                  >
                    <div className="text-2xl mb-2">📁</div>
                    <div className="text-sm font-medium">Upload Custom</div>
                    <div className="text-xs text-gray-500">Browse files</div>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowLogoDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinic Information Dialog */}
      <Dialog open={showClinicDialog} onOpenChange={setShowClinicDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Clinic Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Clinic Information Options */}
              <div>
                <h3 className="font-semibold mb-2">Clinic Information Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertClinicInfo('full-header')}
                  >
                    <div>
                      <div className="font-medium">Full Header</div>
                      <div className="text-sm text-gray-500">Complete clinic header with name, address, phone, email, and website</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertClinicInfo('letterhead')}
                  >
                    <div>
                      <div className="font-medium">Professional Letterhead</div>
                      <div className="text-sm text-gray-500">Formal letterhead design with clinic branding</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertClinicInfo('name-only')}
                  >
                    <div>
                      <div className="font-medium">Clinic Name Only</div>
                      <div className="text-sm text-gray-500">Just the clinic name in bold text</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertClinicInfo('contact-info')}
                  >
                    <div>
                      <div className="font-medium">Contact Information Block</div>
                      <div className="text-sm text-gray-500">Formatted contact details section</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertClinicInfo('signature-block')}
                  >
                    <div>
                      <div className="font-medium">Signature Block</div>
                      <div className="text-sm text-gray-500">Professional signature with clinic details</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Current Clinic Info Preview */}
              <div>
                <h3 className="font-semibold mb-2">Current Clinic Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div><strong>Name:</strong> {clinicInfo.name || 'Not set'}</div>
                  <div><strong>Address:</strong> {clinicInfo.address || 'Not set'}</div>
                  <div><strong>Phone:</strong> {clinicInfo.phone || 'Not set'}</div>
                  <div><strong>Email:</strong> {clinicInfo.email || 'Not set'}</div>
                  <div><strong>Website:</strong> {clinicInfo.website || 'Not set'}</div>
                  <Button 
                    onClick={handleEditClinicInfo} 
                    className="mt-3 w-full border transition-all duration-200"
                    variant="ghost"
                    style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                  >
                    Edit Clinic Info
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowClinicDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Clinic Information Dialog */}
      <Dialog open={showEditClinicDialog} onOpenChange={setShowEditClinicDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Clinic Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Clinic Name</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter clinic name"
                  value={editingClinicInfo.name}
                  onChange={(e) => setEditingClinicInfo({...editingClinicInfo, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Address</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter clinic address"
                  value={editingClinicInfo.address}
                  onChange={(e) => setEditingClinicInfo({...editingClinicInfo, address: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                  value={editingClinicInfo.phone}
                  onChange={(e) => setEditingClinicInfo({...editingClinicInfo, phone: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  value={editingClinicInfo.email}
                  onChange={(e) => setEditingClinicInfo({...editingClinicInfo, email: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Website</label>
                <input
                  type="url"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter website URL"
                  value={editingClinicInfo.website}
                  onChange={(e) => setEditingClinicInfo({...editingClinicInfo, website: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="ghost"
                className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowEditClinicDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="ghost"
                className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={saveClinicInfo}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Information Dialog */}
      <Dialog open={showPatientDialog} onOpenChange={setShowPatientDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Patient Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Patient Information Options */}
              <div>
                <h3 className="font-semibold mb-2">Patient Information Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientInfo('full-details')}
                  >
                    <div>
                      <div className="font-medium">Full Patient Details</div>
                      <div className="text-sm text-gray-500">Complete patient information including name, DOB, ID, address, phone, and email</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientInfo('name-dob')}
                  >
                    <div>
                      <div className="font-medium">Name & Date of Birth</div>
                      <div className="text-sm text-gray-500">Essential patient identification - name and DOB only</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientInfo('contact-info')}
                  >
                    <div>
                      <div className="font-medium">Contact Information</div>
                      <div className="text-sm text-gray-500">Patient contact details including phone, email, and address</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientInfo('demographics')}
                  >
                    <div>
                      <div className="font-medium">Demographics</div>
                      <div className="text-sm text-gray-500">Patient demographics including age, gender, DOB, and insurance</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientInfo('emergency-contact')}
                  >
                    <div>
                      <div className="font-medium">Emergency Contact</div>
                      <div className="text-sm text-gray-500">Emergency contact information with relationship and phone</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Patient Information Templates</h4>
                  <p className="text-sm text-blue-700">
                    These templates insert placeholder text that you can replace with actual patient information. 
                    The placeholders are marked with square brackets (e.g., [Patient Name]) for easy identification and replacement.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowPatientDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipient Information Dialog */}
      <Dialog open={showRecipientDialog} onOpenChange={setShowRecipientDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Recipient Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Recipient Information Options */}
              <div>
                <h3 className="font-semibold mb-2">Recipient Information Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertRecipientInfo('doctor-details')}
                  >
                    <div>
                      <div className="font-medium">Doctor Details</div>
                      <div className="text-sm text-gray-500">Complete doctor information including name, specialty, clinic, and contact details</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertRecipientInfo('specialist-referral')}
                  >
                    <div>
                      <div className="font-medium">Specialist Referral</div>
                      <div className="text-sm text-gray-500">Referral header for specialist consultations with department and reason</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertRecipientInfo('insurance-company')}
                  >
                    <div>
                      <div className="font-medium">Insurance Company</div>
                      <div className="text-sm text-gray-500">Insurance company details with policy and member information</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertRecipientInfo('patient-family')}
                  >
                    <div>
                      <div className="font-medium">Patient Family Member</div>
                      <div className="text-sm text-gray-500">Family member contact information with relationship details</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertRecipientInfo('pharmacy')}
                  >
                    <div>
                      <div className="font-medium">Pharmacy</div>
                      <div className="text-sm text-gray-500">Pharmacy details including address, phone, fax, and license information</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Recipient Information Templates</h4>
                  <p className="text-sm text-blue-700">
                    These templates insert recipient information for medical letters and documents. 
                    The placeholders are marked with square brackets (e.g., [Doctor Name]) for easy identification and replacement with actual recipient details.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowRecipientDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointments Information Dialog */}
      <Dialog open={showAppointmentsDialog} onOpenChange={setShowAppointmentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Appointment Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Appointment Information Options */}
              <div>
                <h3 className="font-semibold mb-2">Appointment Information Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertAppointmentInfo('appointment-details')}
                  >
                    <div>
                      <div className="font-medium">Appointment Details</div>
                      <div className="text-sm text-gray-500">Complete appointment information including date, time, provider, and location</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertAppointmentInfo('next-appointment')}
                  >
                    <div>
                      <div className="font-medium">Next Appointment</div>
                      <div className="text-sm text-gray-500">Information about the patient's next scheduled appointment</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertAppointmentInfo('appointment-history')}
                  >
                    <div>
                      <div className="font-medium">Appointment History</div>
                      <div className="text-sm text-gray-500">List of recent appointments with dates and providers</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertAppointmentInfo('follow-up')}
                  >
                    <div>
                      <div className="font-medium">Follow-up Required</div>
                      <div className="text-sm text-gray-500">Follow-up appointment recommendation with timeframe and purpose</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertAppointmentInfo('appointment-reminder')}
                  >
                    <div>
                      <div className="font-medium">Appointment Reminder</div>
                      <div className="text-sm text-gray-500">Patient reminder with appointment details and instructions</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Appointment Information Templates</h4>
                  <p className="text-sm text-blue-700">
                    These templates insert appointment-related information for medical documents and letters. 
                    The placeholders are marked with square brackets (e.g., [Appointment Date]) for easy identification and replacement with actual appointment details.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowAppointmentsDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Labs Information Dialog */}
      <Dialog open={showLabsDialog} onOpenChange={setShowLabsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Laboratory Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Lab Information Options */}
              <div>
                <h3 className="font-semibold mb-2">Laboratory Information Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertLabInfo('lab-results')}
                  >
                    <div>
                      <div className="font-medium">Laboratory Results</div>
                      <div className="text-sm text-gray-500">Complete lab results with test type, values, and reference ranges</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertLabInfo('blood-work')}
                  >
                    <div>
                      <div className="font-medium">Blood Work Results</div>
                      <div className="text-sm text-gray-500">Blood test results including CBC, glucose, cholesterol, and hemoglobin</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertLabInfo('urine-analysis')}
                  >
                    <div>
                      <div className="font-medium">Urinalysis Results</div>
                      <div className="text-sm text-gray-500">Urine test results including color, clarity, protein, glucose, and cell counts</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertLabInfo('culture-results')}
                  >
                    <div>
                      <div className="font-medium">Culture Results</div>
                      <div className="text-sm text-gray-500">Microbiology culture results with organism identification and sensitivity</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertLabInfo('pending-labs')}
                  >
                    <div>
                      <div className="font-medium">Pending Laboratory Tests</div>
                      <div className="text-sm text-gray-500">List of pending lab tests with order dates and expected results</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Laboratory Information Templates</h4>
                  <p className="text-sm text-blue-700">
                    These templates insert laboratory test information for medical documents and reports. 
                    The placeholders are marked with square brackets (e.g., [Test Results]) for easy identification and replacement with actual laboratory data.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowLabsDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Records Information Dialog */}
      <Dialog open={showPatientRecordsDialog} onOpenChange={setShowPatientRecordsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Patient Records Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Patient Records Options */}
              <div>
                <h3 className="font-semibold mb-2">Patient Records Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientRecordsInfo('medical-history')}
                  >
                    <div>
                      <div className="font-medium">Complete Medical History</div>
                      <div className="text-sm text-gray-500">Comprehensive medical history including past conditions, surgeries, family history, and allergies</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientRecordsInfo('current-medications')}
                  >
                    <div>
                      <div className="font-medium">Current Medications</div>
                      <div className="text-sm text-gray-500">List of current medications with dosages and frequencies</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientRecordsInfo('allergies')}
                  >
                    <div>
                      <div className="font-medium">Allergies & Reactions</div>
                      <div className="text-sm text-gray-500">Known allergies including drugs, foods, environmental triggers, and reaction severity</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientRecordsInfo('vital-signs')}
                  >
                    <div>
                      <div className="font-medium">Latest Vital Signs</div>
                      <div className="text-sm text-gray-500">Recent vital signs measurements including blood pressure, heart rate, and temperature</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertPatientRecordsInfo('diagnosis-history')}
                  >
                    <div>
                      <div className="font-medium">Diagnosis History</div>
                      <div className="text-sm text-gray-500">Current and past diagnoses with ICD-10 codes and treatment history</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Patient Records Templates</h4>
                  <p className="text-sm text-blue-700">
                    These templates insert comprehensive patient medical record information for clinical documentation. 
                    The placeholders are marked with square brackets (e.g., [Medical History]) for easy identification and replacement with actual patient data.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowPatientRecordsDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insert Product Dialog */}
      <Dialog open={showInsertProductDialog} onOpenChange={setShowInsertProductDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Product Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Product Options */}
              <div>
                <h3 className="font-semibold mb-2">Product Information Templates</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertProductInfo('medication')}
                  >
                    <div>
                      <div className="font-medium">Medication Information</div>
                      <div className="text-sm text-gray-500">Complete medication details including generic name, strength, form, manufacturer, NDC, and pricing</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertProductInfo('medical-device')}
                  >
                    <div>
                      <div className="font-medium">Medical Device</div>
                      <div className="text-sm text-gray-500">Medical device specifications including model number, manufacturer, category, FDA approval, and warranty</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertProductInfo('medical-supplies')}
                  >
                    <div>
                      <div className="font-medium">Medical Supplies</div>
                      <div className="text-sm text-gray-500">Medical supplies information including brand, quantity, unit pricing, sterility, and expiration</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertProductInfo('laboratory-test')}
                  >
                    <div>
                      <div className="font-medium">Laboratory Test</div>
                      <div className="text-sm text-gray-500">Lab test details including test code, type, processing time, pricing, and special requirements</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertProductInfo('treatment-package')}
                  >
                    <div>
                      <div className="font-medium">Treatment Package</div>
                      <div className="text-sm text-gray-500">Treatment package information including services, duration, provider, pricing, and coverage details</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Product Information Templates</h4>
                  <p className="text-sm text-blue-700">
                    These templates insert detailed product information for healthcare documentation and billing purposes. 
                    The placeholders are marked with square brackets (e.g., [Product Name]) for easy identification and replacement with actual product data.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowInsertProductDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* More Options Dialog */}
      <Dialog open={showMoreOptionsDialog} onOpenChange={setShowMoreOptionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>More Formatting Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Additional Formatting Options */}
              <div>
                <h3 className="font-semibold mb-2">Additional Formatting Tools</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption('table')}
                  >
                    <div>
                      <div className="font-medium">Insert Table</div>
                      <div className="text-sm text-gray-500">Add a 3x3 table with headers for organizing data</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption('checkbox-list')}
                  >
                    <div>
                      <div className="font-medium">Checkbox List</div>
                      <div className="text-sm text-gray-500">Create a checklist with interactive checkboxes</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption('horizontal-line')}
                  >
                    <div>
                      <div className="font-medium">Horizontal Line</div>
                      <div className="text-sm text-gray-500">Insert a horizontal divider line</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption('date-time')}
                  >
                    <div>
                      <div className="font-medium">Current Date & Time</div>
                      <div className="text-sm text-gray-500">Insert current date and time stamp</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption('signature-line')}
                  >
                    <div>
                      <div className="font-medium">Signature Line</div>
                      <div className="text-sm text-gray-500">Add signature, print name, and date lines</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption('text-box')}
                  >
                    <div>
                      <div className="font-medium">Text Box</div>
                      <div className="text-sm text-gray-500">Insert a highlighted text box for important notes</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Additional Formatting Options</h4>
                  <p className="text-sm text-blue-700">
                    These advanced formatting options provide additional document structure and interactive elements. 
                    Use these tools to create professional documents with tables, checklists, signatures, and highlighted content.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowMoreOptionsDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Saved Templates Dialog */}
      <Dialog open={showSavedTemplatesDialog} onOpenChange={setShowSavedTemplatesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saved Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {templates.map((template: any) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 text-sm text-gray-700">
                          <div dangerouslySetInnerHTML={{ __html: template.content.substring(0, 200) + "..." }} />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            loadTemplate(template.id);
                            setShowSavedTemplatesDialog(false);
                          }}
                        >
                          Load
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/documents/${template.id}`, {
                                method: 'DELETE',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                }
                              });

                              if (response.ok) {
                                toast({
                                  title: "✓ Template Deleted",
                                  description: "Template deleted successfully",
                                  duration: 3000
                                });
                                // Refresh templates
                                window.location.reload();
                              } else {
                                throw new Error('Failed to delete template');
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to delete template",
                                duration: 3000
                              });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No saved templates found.</p>
                <p className="text-sm mt-2">Create a document and click "Save Template" to save it for reuse.</p>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button variant="ghost" className="border transition-all duration-200" 
                style={{ backgroundColor: '#4A7DFF', borderColor: '#4A7DFF', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7279FB'; e.currentTarget.style.borderColor = '#7279FB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A7DFF'; e.currentTarget.style.borderColor = '#4A7DFF'; }}
                onClick={() => setShowSavedTemplatesDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <Toaster />
    </div>
  );
}