import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { 
  ArrowLeft, Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
  Table, Paperclip, Image, Link, MoreHorizontal, Clock,
  Palette, Highlighter, Minus, Plus, Eye, Download,
  Settings, FileText, Calculator, Search, ChevronDown, ChevronUp
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
  const { toast } = useToast();

  const handlePreview = () => {
    toast({ title: "Save and Preview", description: "Document saved and preview opened." });
  };

  const handleSaveAsDraft = () => {
    toast({ title: "Save as Draft", description: "Document saved as draft." });
  };

  const handleBold = () => toast({ title: "Bold", description: "Bold formatting applied." });
  const handleItalic = () => toast({ title: "Italic", description: "Italic formatting applied." });
  const handleUnderline = () => toast({ title: "Underline", description: "Underline formatting applied." });
  const handleBulletList = () => toast({ title: "Bullet List", description: "Bullet list formatting applied." });
  const handleNumberedList = () => toast({ title: "Numbered List", description: "Numbered list formatting applied." });
  const handleAlignLeft = () => toast({ title: "Align Left", description: "Left alignment applied." });
  const handleAlignCenter = () => toast({ title: "Center", description: "Center alignment applied." });
  const handleAlignRight = () => toast({ title: "Align Right", description: "Right alignment applied." });
  const handleAlignJustify = () => toast({ title: "Justify", description: "Justify alignment applied." });
  const handleTable = () => toast({ title: "Insert Table", description: "Table insertion dialog opened." });
  const handleAttachFile = () => toast({ title: "Attach File", description: "File attachment dialog opened." });
  const handleInsertTemplate = () => toast({ title: "Insert Template", description: "Template insertion dialog opened." });
  const handleInsertLogo = () => toast({ title: "Insert Logo", description: "Logo insertion dialog opened." });
  const handleClinic = () => toast({ title: "Clinic", description: "Clinic information options opened." });
  const handlePatient = () => toast({ title: "Patient", description: "Patient information options opened." });
  const handleRecipient = () => toast({ title: "Recipient", description: "Recipient information options opened." });
  const handleAppointments = () => toast({ title: "Appointments", description: "Appointment information options opened." });
  const handleLabs = () => toast({ title: "Labs", description: "Lab results options opened." });
  const handlePatientRecords = () => toast({ title: "Patient Records", description: "Patient records options opened." });
  const handleInsertProduct = () => toast({ title: "Insert Product", description: "Product insertion dialog opened." });
  const handleImage = () => toast({ title: "Insert Image", description: "Image insertion dialog opened." });
  const handleLink = () => toast({ title: "Insert Link", description: "Link insertion dialog opened." });
  const handleHighlight = () => toast({ title: "Text Highlight", description: "Text highlighting tool activated." });
  const handleClock = () => toast({ title: "Insert Time", description: "Time insertion dialog opened." });
  const handleMore = () => toast({ title: "More Options", description: "Additional formatting options opened." });
  const handleParagraph = () => {
    console.log("handleParagraph called");
    if (textareaRef) {
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const selectedText = documentContent.substring(start, end);
      
      if (selectedText) {
        toast({ 
          title: "✓ Paragraph", 
          description: "Paragraph formatting applied to selected text",
          duration: 3000
        });
      } else {
        toast({ 
          title: "Select Text", 
          description: "Please select text to apply paragraph formatting",
          duration: 3000
        });
      }
    }
  };

  const handleH1 = () => {
    console.log("handleH1 called");
    if (textareaRef) {
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const selectedText = documentContent.substring(start, end);
      
      if (selectedText) {
        const beforeText = documentContent.substring(0, start);
        const afterText = documentContent.substring(end);
        const formattedText = selectedText.toUpperCase(); // Make text uppercase for H1 effect
        const newContent = beforeText + formattedText + afterText;
        
        setDocumentContent(newContent);
        setTimeout(() => {
          textareaRef.setSelectionRange(start, start + formattedText.length);
          textareaRef.focus();
        }, 0);
        
        toast({ 
          title: "✓ Heading 1", 
          description: "H1 formatting applied to selected text",
          duration: 3000
        });
      } else {
        toast({ 
          title: "Select Text", 
          description: "Please select text to apply H1 formatting",
          duration: 3000
        });
      }
    }
  };

  const handleH2 = () => {
    console.log("handleH2 called");
    if (textareaRef) {
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const selectedText = documentContent.substring(start, end);
      
      if (selectedText) {
        const beforeText = documentContent.substring(0, start);
        const afterText = documentContent.substring(end);
        const formattedText = selectedText.charAt(0).toUpperCase() + selectedText.slice(1); // Capitalize first letter for H2
        const newContent = beforeText + formattedText + afterText;
        
        setDocumentContent(newContent);
        setTimeout(() => {
          textareaRef.setSelectionRange(start, start + formattedText.length);
          textareaRef.focus();
        }, 0);
        
        toast({ 
          title: "✓ Heading 2", 
          description: "H2 formatting applied to selected text",
          duration: 3000
        });
      } else {
        toast({ 
          title: "Select Text", 
          description: "Please select text to apply H2 formatting",
          duration: 3000
        });
      }
    }
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
            <Select>
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
          <div className="mt-4 p-6 bg-gray-50 border border-gray-200 rounded text-center" style={{ width: '700px' }}>
            <div className="text-teal-600 text-lg font-semibold">🏥 Your Clinic</div>
            <div className="text-xs text-gray-500 mt-1">Header preview will appear here</div>
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
          
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-24 h-7 text-sm border-2 border-gray-400 bg-white font-medium">
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
          
          <Select value={fontSize} onValueChange={setFontSize}>
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
                        setTextColor(color);
                        setShowColorPicker(false);
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

      {/* Document Editor - exact match to Semble */}
      <div className="flex-1 bg-gray-100 overflow-y-auto min-h-0">
        <div className="h-full flex items-center justify-center p-4">
          <div className="bg-white shadow-sm border border-gray-300" style={{ width: '500px', height: '300px' }}>
            <div className="h-full p-4">
              <textarea
                ref={setTextareaRef}
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="w-full h-full resize-none border-none outline-none text-black leading-normal bg-transparent"
                placeholder="Start typing your document here..."
                style={{ 
                  fontFamily: fontFamily === 'verdana' ? 'Verdana, sans-serif' : fontFamily === 'arial' ? 'Arial, sans-serif' : 'Times, serif',
                  fontSize: fontSize,
                  lineHeight: '1.4'
                }}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
      <Toaster />
    </div>
  );
}