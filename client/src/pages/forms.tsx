import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
  Table, Paperclip
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

  return (
    <div className="h-screen flex flex-col">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-7" onClick={() => toast({ title: "Letters", description: "Navigating back to letters list." })}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="text-sm">Letters</span>
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-3 py-1 h-7" onClick={handlePreview}>
              Save and preview
            </Button>
            <Button variant="outline" size="sm" className="h-7" onClick={handleSaveAsDraft}>
              Save as draft
            </Button>
            <div className="text-sm text-gray-600 mx-2">Letter body</div>
            <span className="text-sm text-gray-600 cursor-pointer">Select Patient...</span>
            <span className="text-sm text-gray-600 cursor-pointer">New Chris...</span>
            <span className="text-sm text-gray-600 cursor-pointer">Share this...</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-3 py-1 flex-shrink-0">
        {/* First row - Main formatting options */}
        <div className="flex justify-center w-full mb-1">
          <div className="flex items-center gap-1">
            {/* Font controls */}
            <Select value={textStyle} onValueChange={setTextStyle}>
              <SelectTrigger className="w-20 h-6 text-xs">
                <SelectValue placeholder="Paragraph" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="heading1">Heading 1</SelectItem>
                <SelectItem value="heading2">Heading 2</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-16 h-6 text-xs">
                <SelectValue placeholder="Verdana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verdana">Verdana</SelectItem>
                <SelectItem value="arial">Arial</SelectItem>
                <SelectItem value="times">Times</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-12 h-6 text-xs">
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
            
            {/* Text formatting */}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleBold}>
              <Bold className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleItalic}>
              <Italic className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleUnderline}>
              <Underline className="h-3 w-3" />
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Lists */}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleBulletList}>
              <List className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleNumberedList}>
              <ListOrdered className="h-3 w-3" />
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Alignment */}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleAlignLeft}>
              <AlignLeft className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleAlignCenter}>
              <AlignCenter className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleAlignRight}>
              <AlignRight className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleAlignJustify}>
              <AlignJustify className="h-3 w-3" />
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Text color */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowColorPicker(!showColorPicker)}>
                <div className="flex flex-col items-center">
                  <Type className="h-2 w-2" />
                  <div className="w-3 h-0.5 bg-red-500 mt-0.5"></div>
                </div>
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
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Insert Options */}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleTable}>
              <Table className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleAttachFile}>
              <Paperclip className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Second row - Medical data buttons */}
        <div className="flex justify-center w-full">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handleInsertTemplate}>
              Insert template
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handleInsertLogo}>
              Insert logo
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handleClinic}>
              Clinic
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handlePatient}>
              Patient
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handleRecipient}>
              Recipient
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handleAppointments}>
              Appointments
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handleLabs}>
              Labs
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handlePatientRecords}>
              Patient records
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-5 px-2" onClick={handleInsertProduct}>
              Insert product
            </Button>
          </div>
        </div>
      </div>

      {/* Document Editor */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        <div className="h-full flex items-center justify-center p-3">
          <div className="bg-white shadow-md border border-gray-200" style={{ width: '580px', height: '360px', borderRadius: '1px' }}>
            <div className="h-full p-4">
              <textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="w-full h-full resize-none border-none outline-none text-black text-sm leading-relaxed bg-transparent"
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