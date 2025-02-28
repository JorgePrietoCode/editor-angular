import { Component, ElementRef, ViewChild, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface EditorState {
  content: string;
  currentFilePath: FileSystemFileHandle | null;
  showContextMenu: boolean;
  contextMenuPosition: {
    x: number;
    y: number;
  };
}

interface FilePickerOptions {
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <header class="toolbar">
        <div class="logo-section">
          <div class="logo">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <span class="logo-text">TextPro Editor</span>
          </div>
        </div>
        <div class="toolbar-buttons">
          <button (click)="newFile()" title="Nuevo archivo (Ctrl+N)">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Nuevo
          </button>
          <button (click)="openFile()" title="Abrir archivo (Ctrl+O)">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
            </svg>
            Abrir
          </button>
          <button (click)="save()" title="Guardar (Ctrl+S)">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            Guardar
          </button>
        </div>
        <span class="file-info" *ngIf="currentFileName()">
          Archivo actual: {{ currentFileName() }}
        </span>
      </header>

      <textarea
        #editorTextarea
        [ngModel]="state().content"
        (ngModelChange)="updateContent($event)"
        (contextmenu)="onContextMenu($event)"
        placeholder="Escribe aquí tu texto o haz clic derecho para ver las opciones"
        class="editor-textarea"
        spellcheck="true">
      </textarea>

      <div #contextMenu 
           class="context-menu" 
           [class.visible]="state().showContextMenu"
           [style.left.px]="state().contextMenuPosition.x" 
           [style.top.px]="state().contextMenuPosition.y">
        <div class="menu-item" (click)="copy()">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
          Copiar
        </div>
        <div class="menu-item" (click)="cut()">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5.5-.22.5-.5.5.5zM19 3l-6 6 2 2 7-7V3z"/>
          </svg>
          Cortar
        </div>
        <div class="menu-item" (click)="paste()">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/>
          </svg>
          Pegar
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" (click)="save()">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          Guardar
        </div>
      </div>

      <footer class="status-bar">
        <span>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"/>
          </svg>
          Caracteres: {{ characterCount() }}
        </span>
        <span>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M3 17h18v-2H3v2zm0 3h18v-1H3v1zm0-7h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          Líneas: {{ lineCount() }}
        </span>
        <span>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M4 9h16v2H4V9zm0 4h16v2H4v-2z"/>
          </svg>
          Palabras: {{ wordCount() }}
        </span>
      </footer>
    </div>
  `,
  styles: [`
    /* Estilos globales para eliminar márgenes y desplazamiento */
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background-color: #1e1e1e;
      color: #d4d4d4;
      padding: 0.5rem;
      box-sizing: border-box;
      gap: 0.5rem;
      margin: 0;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }

    .logo-section {
      display: flex;
      align-items: center;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #0078d4;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .logo svg {
      width: 24px;
      height: 24px;
    }

    .logo-text {
      background: linear-gradient(45deg, #0078d4, #00a2ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 1.4rem;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem;
      background: #252526;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .toolbar-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .file-info {
      color: #858585;
      font-size: 0.9rem;
      padding: 0.5rem 1rem;
      background: #333333;
      border-radius: 4px;
      display: flex;
      align-items: center;
    }

    button {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 6px;
      background: #0078d4;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    button:hover {
      background: #2b8dd8;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    button:active {
      transform: translateY(0);
      box-shadow: none;
    }

    .editor-textarea {
      flex: 1;
      padding: 1rem;
      border: none;
      border-radius: 8px;
      resize: none;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 15px;
      line-height: 1.6;
      background: #252526;
      color: #d4d4d4;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
      transition: box-shadow 0.3s ease;
      margin: 0;
      width: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    }

    .editor-textarea:focus {
      outline: none;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1), 0 0 0 2px rgba(0,120,212,0.4);
    }

    .context-menu {
      position: fixed;
      display: none;
      background: #252526;
      border: 1px solid #333333;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      min-width: 180px;
      padding: 0.5rem;
    }

    .context-menu.visible {
      display: block;
      animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .menu-item {
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 4px;
      color: #d4d4d4;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .menu-item:hover {
      background: #2b2b2b;
      color: #ffffff;
    }

    .menu-separator {
      height: 1px;
      background: #333333;
      margin: 0.5rem 0;
    }

    .status-bar {
      display: flex;
      gap: 2rem;
      padding: 0.75rem 1.5rem;
      background: #252526;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #858585;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .status-bar span {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Estilizar la barra de desplazamiento */
    .editor-textarea::-webkit-scrollbar {
      width: 12px;
    }

    .editor-textarea::-webkit-scrollbar-track {
      background: #1e1e1e;
      border-radius: 8px;
    }

    .editor-textarea::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 8px;
      border: 3px solid #1e1e1e;
    }

    .editor-textarea::-webkit-scrollbar-thumb:hover {
      background: #4f4f4f;
    }

    /* Asegurar que no hay márgenes blancos */
    ::ng-deep body {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background-color: #1e1e1e !important;
    }

    ::ng-deep html {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background-color: #1e1e1e !important;
    }
  `]
})
export class EditorComponent {
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('contextMenu') contextMenu!: ElementRef;

  // Estado del editor
  protected state = signal<EditorState>({
    content: '',
    currentFilePath: null,
    showContextMenu: false,
    contextMenuPosition: { x: 0, y: 0 }
  });

  // Valores computados
  characterCount = computed(() => this.state().content.length);
  lineCount = computed(() => this.state().content.split('\n').length);
  wordCount = computed(() => {
    const text = this.state().content.trim();
    return text ? text.split(/\s+/).length : 0;
  });
  currentFileName = computed(() => {
    const file = this.state().currentFilePath;
    return file ? file.name : null;
  });

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Cerrar menú contextual al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (this.state().showContextMenu && 
          !this.contextMenu.nativeElement.contains(e.target as Node)) {
        this.updateState({ showContextMenu: false });
      }
    });

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey) {
        switch(e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            this.save();
            break;
          case 'o':
            e.preventDefault();
            this.openFile();
            break;
          case 'n':
            e.preventDefault();
            this.newFile();
            break;
        }
      }
    });
  }

  private updateState(newState: Partial<EditorState>): void {
    this.state.update(state => ({ ...state, ...newState }));
  }

  updateContent(newContent: string): void {
    this.updateState({ content: newContent });
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.updateState({
      showContextMenu: true,
      contextMenuPosition: {
        x: event.clientX,
        y: event.clientY
      }
    });
  }

  async newFile(): Promise<void> {
    if (this.state().content && !confirm('¿Deseas descartar los cambios?')) {
      return;
    }
    this.updateState({
      content: '',
      currentFilePath: null
    });
  }

  private async getFileHandle(options: FilePickerOptions, save = false): Promise<FileSystemFileHandle | null> {
    try {
      if (save) {
        return await (window as any).showSaveFilePicker(options);
      }
      const [fileHandle] = await (window as any).showOpenFilePicker(options);
      return fileHandle;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error al manejar el archivo:', error);
      }
      return null;
    }
  }

  async openFile(): Promise<void> {
    const fileHandle = await this.getFileHandle({
      types: [{
        description: 'Archivos de texto',
        accept: { 'text/plain': ['.txt'] }
      }]
    });

    if (!fileHandle) return;

    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      this.updateState({
        content,
        currentFilePath: fileHandle
      });
    } catch (error) {
      console.error('Error al leer el archivo:', error);
    }
  }

  async save(): Promise<void> {
    try {
      let fileHandle = this.state().currentFilePath;
      
      if (!fileHandle) {
        fileHandle = await this.getFileHandle({
          types: [{
            description: 'Archivos de texto',
            accept: { 'text/plain': ['.txt'] }
          }]
        }, true);

        if (!fileHandle) return;
      }
      
      const writable = await (fileHandle as any).createWritable();
      await writable.write(this.state().content);
      await writable.close();
      
      this.updateState({ currentFilePath: fileHandle });
    } catch (error) {
      console.error('Error al guardar el archivo:', error);
    }
  }

  copy(): void {
    document.execCommand('copy');
    this.updateState({ showContextMenu: false });
  }

  cut(): void {
    document.execCommand('cut');
    this.updateState({ showContextMenu: false });
  }

  paste(): void {
    document.execCommand('paste');
    this.updateState({ showContextMenu: false });
  }
} 