import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Save, ChevronDown, Undo, Redo, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered,
  FileText, Plus, Eye, Download, Settings, Image, Link, Users, MoreHorizontal
} from "lucide-react";

interface DocumentForm {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  type: 'form' | 'template' | 'document';
  status: 'draft' | 'published';
}

const mockDocuments: DocumentForm[] = [
  {
    id: "doc_1",
    title: "Patient Intake Form",
    content: "<h1>Patient Information Form</h1><p>Please fill out the following information completely and accurately.</p><h2>Personal Information</h2><p><strong>Full Name:</strong> ________________</p><p><strong>Date of Birth:</strong> ________________</p><p><strong>Phone Number:</strong> ________________</p><p><strong>Email Address:</strong> ________________</p><h2>Medical History</h2><p><strong>Current Medications:</strong></p><p>________________</p><p><strong>Known Allergies:</strong></p><p>________________</p><p><strong>Previous Surgeries:</strong></p><p>________________</p>",
    lastModified: "2025-01-08T10:30:00Z",
    type: 'form',
    status: 'published'
  },
  {
    id: "doc_2", 
    title: "Consent Form Template",
    content: "<h1>Medical Consent Form</h1><p>I, ________________, hereby give my consent for medical treatment.</p><p><strong>Date:</strong> ________________</p><p><strong>Patient Signature:</strong> ________________</p>",
    lastModified: "2025-01-07T14:15:00Z",
    type: 'template',
    status: 'draft'
  }
];

export default function FormsPage() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentForm | null>(mockDocuments[0]);
  const [isEditing, setIsEditing] = useState(true);
  const [documentContent, setDocumentContent] = useState(selectedDocument?.content || "");
  const [documentTitle, setDocumentTitle] = useState(selectedDocument?.title || "");
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Document Saved",
      description: "Your form has been saved successfully.",
    });
  };

  const handlePreview = () => {
    toast({
      title: "Preview Generated",
      description: "Form preview has been generated successfully.",
    });
  };

  const handleSaveAsDraft = () => {
    toast({
      title: "Saved as Draft",
      description: "Your form has been saved as draft.",
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm">Letters</span>
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2" onClick={handlePreview}>
            Save and preview
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveAsDraft}>
            Save as draft
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          Letter body
        </div>
        <div className="w-24"></div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Select defaultValue="paragraph">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="heading1">Heading 1</SelectItem>
                <SelectItem value="heading2">Heading 2</SelectItem>
                <SelectItem value="heading3">Heading 3</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="verdana">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verdana">Verdana</SelectItem>
                <SelectItem value="arial">Arial</SelectItem>
                <SelectItem value="times">Times</SelectItem>
                <SelectItem value="calibri">Calibri</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="12pt">
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8pt">8pt</SelectItem>
                <SelectItem value="10pt">10pt</SelectItem>
                <SelectItem value="12pt">12pt</SelectItem>
                <SelectItem value="14pt">14pt</SelectItem>
                <SelectItem value="16pt">16pt</SelectItem>
                <SelectItem value="18pt">18pt</SelectItem>
                <SelectItem value="20pt">20pt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Underline className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <div className="w-4 h-4 border border-gray-400"></div>
            </Button>
            <Button variant="ghost" size="sm">
              <div className="w-4 h-4 bg-gray-800"></div>
            </Button>
            <Button variant="ghost" size="sm">
              <div className="w-4 h-4 border border-gray-400 bg-yellow-300"></div>
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-3">
          <Button variant="ghost" size="sm" className="text-sm">
            Insert template
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm">
            Insert logo
          </Button>
          <Button variant="ghost" size="sm" className="text-sm">
            Clinic
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm">
            Patient
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm">
            Recipient
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm">
            Appointments
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm">
            Labs
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 mt-2">
          <Button variant="ghost" size="sm" className="text-sm">
            Patient records
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="text-sm">
            Insert product
          </Button>
        </div>
      </div>

      {/* Document Editor */}
      <div className="flex-1 bg-gray-100 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-white shadow-sm min-h-full">
          <div className="p-12">
            <textarea
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              className="w-full h-96 resize-none border-none outline-none text-base leading-relaxed bg-transparent"
              placeholder="Start typing your document here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}