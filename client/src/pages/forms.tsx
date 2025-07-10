import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
  Table, Paperclip, Image, Link, MoreHorizontal, Clock,
  Palette, Highlighter, Minus, Plus, Eye, Download,
  Settings, FileText, Calculator, Search
} from "lucide-react";

export default function Forms() {
  const [documentContent, setDocumentContent] = useState("");
  const [fontFamily, setFontFamily] = useState("verdana");
  const [fontSize, setFontSize] = useState("12pt");
  const [textStyle, setTextStyle] = useState("paragraph");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
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

      {/* Toolbar - exact match to Semble with all visible options */}
      <div className="bg-white border-b border-gray-200 px-2 py-2 flex-shrink-0">
        {/* Main formatting row */}
        <div className="flex justify-center items-center gap-0.5 mb-2">
          {/* Font controls */}
          <Select value={textStyle} onValueChange={setTextStyle}>
            <SelectTrigger className="w-14 h-6 text-xs border border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">P</SelectItem>
              <SelectItem value="heading1">H1</SelectItem>
              <SelectItem value="heading2">H2</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-24 h-7 text-sm border-2 border-gray-400 bg-white font-medium">
              <SelectValue placeholder="Verdana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="verdana">Verdana</SelectItem>
              <SelectItem value="arial">Arial</SelectItem>
              <SelectItem value="times">Times</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger className="w-16 h-7 text-sm border-2 border-gray-400 bg-white font-medium">
              <SelectValue placeholder="12pt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10pt">10pt</SelectItem>
              <SelectItem value="11pt">11pt</SelectItem>
              <SelectItem value="12pt">12pt</SelectItem>
              <SelectItem value="14pt">14pt</SelectItem>
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
      <div className="flex-1 bg-gray-100 overflow-hidden">
        <div className="h-full flex items-center justify-center p-4">
          <div className="bg-white shadow-sm border border-gray-300" style={{ width: '500px', height: '300px' }}>
            <div className="h-full p-4">
              <textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="w-full h-full resize-none border-none outline-none text-black text-sm leading-normal bg-transparent"
                placeholder=""
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
  );
}