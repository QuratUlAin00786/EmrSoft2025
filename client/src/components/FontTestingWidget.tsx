import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FontTestingWidget = () => {
  const [testText, setTestText] = useState('Figtree vs Roboto: fog gym qty 1234567890');
  const [fontSize, setFontSize] = useState('16');
  const [isVisible, setIsVisible] = useState(false);

  const testSizes = ['12', '16', '20', '24', '32', '48'];
  const criticalChars = 'f t y g q 1234567890';
  const testSentences = [
    'The quick brown fox jumps over the lazy dog',
    'Typography quality affects user experience',
    'fog gym qty style guide testing',
    '1234567890 numeric display test'
  ];

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          Font Test Tool
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Font Comparison Tool - Figtree vs Roboto</CardTitle>
          <Button variant="outline" onClick={() => setIsVisible(false)}>×</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="testText">Test Text</Label>
              <Input
                id="testText"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to compare..."
              />
            </div>
            <div className="w-32">
              <Label htmlFor="fontSize">Font Size (px)</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testSizes.map(size => (
                    <SelectItem key={size} value={size}>{size}px</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Critical Characters Test */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Critical Character Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">Figtree Font</h4>
                <div 
                  className="p-4 bg-blue-50 rounded border text-center"
                  style={{ 
                    fontFamily: "'Figtree', 'FigtreeLocal', 'FigtreeForced', sans-serif",
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.5
                  }}
                >
                  {criticalChars}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-600">Roboto Font</h4>
                <div 
                  className="p-4 bg-gray-50 rounded border text-center"
                  style={{ 
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.5
                  }}
                >
                  {criticalChars}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Text Comparison */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Custom Text Comparison</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">Figtree Font</h4>
                <div 
                  className="p-4 bg-blue-50 rounded border min-h-[100px]"
                  style={{ 
                    fontFamily: "'Figtree', 'FigtreeLocal', 'FigtreeForced', sans-serif",
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.5,
                    wordBreak: 'break-word'
                  }}
                >
                  {testText}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-600">Roboto Font</h4>
                <div 
                  className="p-4 bg-gray-50 rounded border min-h-[100px]"
                  style={{ 
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.5,
                    wordBreak: 'break-word'
                  }}
                >
                  {testText}
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Size Test */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Multi-Size Comparison (12px vs 32px)</h3>
            {[12, 32].map(size => (
              <div key={size} className="mb-6">
                <h4 className="font-medium mb-2">{size}px Size Comparison</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-blue-600 font-medium">Figtree {size}px</div>
                    <div 
                      className="p-3 bg-blue-50 rounded border"
                      style={{ 
                        fontFamily: "'Figtree', 'FigtreeLocal', 'FigtreeForced', sans-serif",
                        fontSize: `${size}px`,
                        lineHeight: 1.4
                      }}
                    >
                      Typography quality: fog gym qty
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600 font-medium">Roboto {size}px</div>
                    <div 
                      className="p-3 bg-gray-50 rounded border"
                      style={{ 
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: `${size}px`,
                        lineHeight: 1.4
                      }}
                    >
                      Typography quality: fog gym qty
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Analysis Notes */}
          <div className="border rounded-lg p-4 bg-yellow-50">
            <h3 className="text-lg font-semibold mb-2">What to Look For:</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>Letter "g":</strong> Figtree should show double-storey (circular loops), Roboto shows single-storey</li>
              <li><strong>Letters "f" and "t":</strong> Figtree has more playful curved endings</li>
              <li><strong>Letter "y":</strong> Figtree's descender should have a softer curve</li>
              <li><strong>Character spacing:</strong> Figtree should appear more relaxed and spacious</li>
              <li><strong>X-height:</strong> Figtree should have slightly higher lowercase letters</li>
              <li><strong>Overall feel:</strong> Figtree should look more friendly and approachable</li>
            </ul>
          </div>

          {/* Preset Test Sentences */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Preset Test Sentences</h3>
            {testSentences.map((sentence, idx) => (
              <div key={idx} className="mb-4 p-2 border-l-4 border-blue-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTestText(sentence)}
                  className="mb-2 text-blue-600"
                >
                  Use: "{sentence}"
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FontTestingWidget;