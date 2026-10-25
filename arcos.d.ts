// @ts-nocheck
/// ARCOS GLOBAL TYPE DEFINITIONS V2
///
/// This file contains errors. I know. The important thing is that all relevant types
/// are detected and processed properly. Don't worry about it.
///
/// © IzKuipers 2025, 2026. Licensed under GPLv3.
///

declare global {
  export const env: IEnvironment;
  export const handler: IProcessHandler;
  export const fs: IFilesystem;
  export const daemon: IUserDaemon;
  export const serviceHost: IServiceHost | undefined;
  export const MessageBox: (data: MessageBoxData, parentPid: number, overlay?: boolean) => Promise<void>;
  export const icons: Record<string, string>;
  export const util: {
    htmlspecialchars: (text: string) => string;
    Plural: (s: string, x: number) => string;
    sliceIntoChunks: (arr: any[], chunkSize: number) => any[][];
    decimalToHex: (value: number, maxLength?: number) => string;
    sha256: (message: string) => Promise<string>;
    CountInstances: (input: string, search: string) => number;
    join: (...args: string[]) => string;
    getItemNameFromPath: (path: string) => string;
    getParentDirectory: (p: string) => string;
    getDriveLetter: (path: string, allowUuid?: boolean) => string | undefined;
    formatBytes: (bytes: number) => string;
    DownloadFile: (file: ArrayBuffer, filename: string, mimetype?: string | undefined) => void;
    onFileChange: (path: string, callback: () => void) => void;
    onFolderChange: (path: string, callback: () => void) => void;
  };
  export const convert: {
    arrayToText: (buffer: (ArrayBuffer | SharedArrayBuffer) | ArrayLike<number>) => string | undefined;
    textToArrayBuffer: (text: string) => ArrayBuffer;
    blobToText: (blob: Blob) => Promise<string>;
    textToBlob: (text: string, type?: string) => Blob;
    arrayToBlob: (buffer: ArrayBuffer, type?: string) => Blob;
    blobToDataURL: (blob: Blob) => Promise<string | undefined>;
  };
  export const workingDirectory: string;
  export const Process: Constructs<IProcess>;
  export const AppProcess: IAppProcessConstructor;
  export const ThirdPartyAppProcess: Constructs<IThirdPartyAppProcess>;
  export const ThirdPartyProcess: Constructs<IThirdPartyProcess>;
  export const FilesystemDrive: Constructs<IFilesystemDrive>;
  export const argv: any[];
  export const app: App;
  export const Sleep: (ms?: number) => Promise<void>;
  export const Store: <T>(initial?: T | undefined) => ReadableStore<T>;
  export const $ENTRYPOINT: string;
  export const $METADATA: string;
  export const SHELL_PID: number;
  export const OPERATION_ID: string;
  export const load: (path: string) => Promise<any>;
  export const runApp: (
    process: IAppProcessConstructor,
    metadataPath: string,
    parentPid?: number,
    ...args: any[]
  ) => Promise<IThirdPartyAppProcess | undefined>;
  export const runAppDirect: (
    process: IAppProcessConstructor,
    metadataPath: string,
    parentPid?: number,
    ...args: any[]
  ) => Promise<IThirdPartyAppProcess | undefined>;
  export const loadHtml: (path: string) => Promise<string | undefined>;
  export const loadDirect: (path: string) => Promise<string | undefined>;
  export const Server: AxiosInstance;
  export const BaseService: Constructs<IBaseService>;
  export const TrayIconProcess: Constructs<ITrayIconProcess>;
  export const Debug: (m: any) => void;
  export const CustomTitlebar: Constructs<ICustomTitlebar>;
  export const contextProps: (
    node: HTMLElement,
    args: any[]
  ) =>
    | {
        destroy: () => void;
      }
    | undefined;
  export const UserPaths: Record<string, string>;
  export const UserPathCaptions: Record<string, string>;
  export const UserPathIcons: Record<string, string>;
  export const SystemFolders: string[];
  export const HiddenUserPaths: string[];

  /// SOURCE FILE: src/types/terminal.ts ///

  export interface TerminalCommand {
    keyword: string;
    description: string;
    hidden?: boolean;
    exec: (term: IArcTerminal, flags: Arguments, argv: string[]) => number | Promise<number>;
  }
  export type Arguments = Record<string, string | boolean | any[] | object>;
  export interface Variable {
    get: () => string | undefined;
    set?: (v: string) => Promise<any> | any;
    value?: string;
    readOnly: boolean;
    canDelete: boolean;
  }
  export type VariableStore = { [key: string]: Variable };
  export interface StaticVariable {
    value: string | undefined;
    readOnly: boolean;
  }
  export type StaticVariableStore = { [key: string]: StaticVariable };
  export type Sections = { [key: string]: string[] };
  export interface ArcTermConfiguration {
    prompt?: string;
    greeting?: string;
    noLogo?: boolean;
    red?: string;
    green?: string;
    yellow?: string;
    blue?: string;
    cyan?: string;
    magenta?: string;
    foreground?: string;
    background?: string;
    brightBlack?: string;
    backdropOpacity?: number;
  }
  export type ExpandedTerminal = Terminal & { process?: ITerminalWindowRuntime };
  export type AdminCommandType = (term: IArcTerminal, admin: IAdminBootstrapper, argv: string[]) => Promise<number>;

  /// SOURCE FILE: src/interfaces/common.ts ///

  export type Primitive = null | undefined | string | number | boolean | symbol | bigint;
  export type LiteralUnion<LiteralType extends BaseType, BaseType extends Primitive> = LiteralType | (BaseType & { _?: never });
  
  export interface Constructs<T, R extends Array<unknown> = any[]> {
    new (...args: R): T;
  }

  /// SOURCE FILE: src/interfaces/IUserDaemon.ts ///

  export interface IUserDaemon extends IProcess {
    username: string;
    token: string;
    userInfo: UserInfo;
    autoLoadComplete: boolean;
    safeMode: boolean;
    initialized: boolean;
    _blockLeaveInvocations: boolean;
    _toLoginInvoked: boolean;
    _criticalProcess: boolean;
    copyList: ReadableStore<string[]>;
    cutList: ReadableStore<string[]>;
    get betaClient(): AxiosInstance;
    get globalDispatch(): IGlobalDispatch | undefined;
    get assoc(): IFileAssocService | undefined;
    serviceHost?: IServiceHost;
    get libraries(): ILibraryManagement | undefined;
    account?: IAccountUserContext;
    activity?: ILoginActivityUserContext;
    apps?: IApplicationsUserContext;
    appreg?: IAppRegistrationUserContext;
    renderer?: IAppRendererUserContext;
    checks?: IChecksUserContext;
    elevation?: IElevationUserContext;
    files?: IFilesystemUserContext;
    helpers?: IHelpersUserContext;
    icons?: IIconsUserContext;
    init?: IInitUserContext;
    notifications?: INotificationsUserContext;
    power?: IPowerUserContext;
    preferencesCtx?: IPreferencesUserContext;
    spawn?: ISpawnUserContext;
    themes?: IThemesUserContext;
    version?: IVersionUserContext;
    wallpaper?: IWallpaperUserContext;
    workspaces?: IWorkspaceUserContext;
    shortcuts?: IShortcutsUserContext;
    get preferences(): ReadableStore<UserPreferences>;
    get canPaste(): boolean;
    start(): Promise<false | undefined>;
    stop(): Promise<false | undefined>;
    startUserContexts(): Promise<void>;
    stopUserContexts(): Promise<void>;
    appStorage(): IApplicationStorage | undefined;
    getShell(): IShellRuntime | undefined;
    updateGlobalDispatch(): void;
    GetConnector<T extends IServerConnector>(name: string): T;
    startUserDaemon(startOptions: UserDaemonStartOptions, broadcast: (m: string) => void): Promise<ICommandResult<IUserDaemon>>;
  }
  
  export interface IUserContext {
    __init(): Promise<void>;
    _init(): Promise<void>;
    __deactivate(): Promise<void>;
    _deactivate(): Promise<void>;
  }
  

  /// SOURCE FILE: src/interfaces/IThirdPartyProcess.ts ///

  export interface IThirdPartyProcess extends IProcess {
    workingDirectory: string;
    operationId: string;
    mutationLock: boolean;
    handler: IProcessHandler;
    app: AppProcessData;
    args: any[];
    userPreferences: UserPreferencesStore;
    windowIcon: StringStore;
    crashReason: string;
    windowTitle: ReadableStore<string>;
    componentMount: Record<string, any>;
    username: string;
  
    onStarted(): MaybePromise<any>;
    closeIfSecondInstance(): Promise<this | undefined>;
    getSingleton(): this[];
    loadCSS(path: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/IThirdPartyAppProcess.ts ///

  export interface IThirdPartyAppProcess extends IAppProcess {
    workingDirectory: string;
    operationId: string;
    mutationLock: boolean;
    urlCache: Record<string, string>;
    elements: Record<string, Element>;
    __render__(body: HTMLDivElement): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/ISqlInterfaceProcess.ts ///

  export interface ISqlInterfaceProcess extends IProcess {
    db?: Database;
    isFresh: boolean;
  
    start(): Promise<void>;
    reset(): void;
    initialize(): Promise<void>;
    readFile(): Promise<void>;
    writeFile(): Promise<void>;
    stop(): Promise<void>;
    exec(sql: string, params?: BindParams | undefined): Record<string, any>[][] | string;
  }

  /// SOURCE FILE: src/interfaces/IServiceHost.ts ///

  export interface IBaseService extends IProcess {
    host: IServiceHost;
    activated: boolean;
    deactivate(broadcast?: (m: string) => void): Promise<void>;
    GetConnector<T extends IServerConnector>(name: string): T;
  }
  
  export interface IServiceHost extends IProcess {
    Services: ReadableServiceStore;
    _holdRestart: boolean;
    initialRun(broadcast?: (m: string) => void): Promise<void>;
    init(broadcast?: (m: string) => void): Promise<void>;
    stop(): Promise<void>;
    readonly STORE: Map<ServiceIdentifier, Service>;
    loadStore(store: ServiceStore): boolean;
    getServiceInfo(id: ServiceIdentifier): Service | undefined;
    startService(id: ServiceIdentifier): Promise<ServiceChangeResult>;
    stopService(id: ServiceIdentifier): Promise<ServiceChangeResult>;
    restartService(id: ServiceIdentifier): Promise<ServiceChangeResult>;
    verifyServicesProcesses(): Promise<void>;
    getService<T extends IBaseService = IBaseService>(id: ServiceIdentifier): T | undefined;
    hasService(id: ServiceIdentifier): boolean;
    spinDown(broadcast?: (message: string) => void): Promise<void>;
    Gate<T extends IBaseService>(id: ServiceIdentifier, onActive: (service: T) => void, onInactive?: () => void): void;
  }
  
  export type ServiceIdentifier =
    | "TrashSvc"
    | "BugHuntUsp"
    | "ShareMgmt"
    | "AppStorage"
    | "ArcFindSvc"
    | "SystemShortcutsSvc"
    | "ProtoService"
    | "TrayHostSvc"
    | "AdminBootstrapper"
    | "FileAssocSvc"
    | "GlobalDispatch"
    | "MessagingService"
    | "DevEnvironment"
    | "DistribSvc"
    | "IconService"
    | "LibMgmtSvc"
    | "MigrationSvc"
    | "RecentFilesSvc";

  /// SOURCE FILE: src/interfaces/IProcess.ts ///

  export interface IProcess {
    dispatch: IProcessDispatch;
    pid: number;
    parentPid: number;
    name: string;
    get _disposed(): boolean;
    _criticalProcess: boolean;
    sourceUrl: string;
    STATE: ProcessState;
    get MEMORY(): number;
    __start(): Promise<any>;
    __stop(): Promise<any>;
    killSelf(): Promise<void>;
    requestFileLock(path: string): Promise<false | undefined>;
    unlockFile(path: string): Promise<false | undefined>;
    setSource(source: string): void;
  }
  
  export interface IProcessDispatch {
    subscribe(event: string, callback: DispatchCallback): void;
    dispatch(event: string, ...args: any[]): Promise<boolean>;
  }

  /// SOURCE FILE: src/interfaces/IMigrationNode.ts ///

  export interface IMigrationNode {
    svc: IMigrationService;
    _runMigration(cb?: MigrationStatusCallback): Promise<MigrationResult>;
    Log(message: string, level?: LogLevel): Promise<void>;
  }
  
  export interface IMigrationNodeConstructor extends Constructs<IMigrationNode, [IMigrationNodeConstructor, IMigrationService]> {
    name: string;
    friendlyName: string;
    inversional: boolean;
    deprecated: boolean;
    version: number;
  }

  /// SOURCE FILE: src/interfaces/IInstallerProcessBase.ts ///

  export interface IInstallerProcessBase extends IProcess {
    parent: IDistributionServiceProcess;
    failReason: ReadableStore<string>;
    installing: ReadableStore<boolean>;
    TOTAL_COUNT: ReadableStore<number>;
    completed: ReadableStore<boolean>;
    COUNT: ReadableStore<number>;
    focused: ReadableStore<string>;
    status: ReadableStore<InstallStatus>;
    start(): Promise<void>;
    initialize(): Promise<void>;
    stop(): Promise<void>;
    onStop(): Promise<void>;
    logStatus(content: string, type?: InstallStatusType, status?: InstallStatusMode): void;
    setCurrentStatus(status: InstallStatusMode): Promise<void>;
    setCurrentContent(content: string): Promise<void>;
    fail(reason: string): void;
    __go(): Promise<boolean>;
    go(): Promise<boolean>;
    mkdir(path: string): Promise<boolean>;
    writeFile(path: string, content: ArrayBuffer): Promise<boolean>;
    createInstallLocation(): Promise<boolean>;
    getFiles(): Promise<{
      files: {
        [k: string]: JSZip.JSZipObject;
      };
      sortedPaths: string[];
    }>;
  }
  
  export interface IInstallerProcessBaseConstructor extends Constructs<IInstallerProcessBase> {
    validatePackage(metadata: ArcPackage, zip: JSZip): Promise<boolean>;
    uninstallPackage(metadata: ArcPackage, deleteFiles?: boolean, onStage?: (stage: string) => void): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/IFilesystemDrive.ts ///

  export interface IFilesystemDrive {
    server: IServerManager;
    driveLetter: string | undefined;
    label: string;
    uuid: string;
    readonly FIXED: boolean;
    readonly REMOVABLE: boolean;
    readonly READONLY: boolean;
    readonly HIDDEN: boolean;
    readonly IDENTIFIES_AS: string;
    readonly FILESYSTEM_SHORT: string;
    readonly FILESYSTEM_LONG: string;
    readonly CAPABILITIES: Record<DriveCapabilities, boolean>;
    BUSY: boolean;
    Log(message: string, level?: LogLevel): void;
    lockFile(path: string, pid: number): Promise<void>;
    releaseLock(path: string, pid: number, fromSystem?: boolean): Promise<void>;
    __spinUp(onProgress?: FilesystemProgressCallback): Promise<boolean>;
    __spinDown(onProgress?: FilesystemProgressCallback): Promise<boolean>;
    _spinUp(onProgress?: FilesystemProgressCallback): Promise<boolean>;
    _spinDown(onProgress?: FilesystemProgressCallback): Promise<boolean>;
    readDir(path: string): Promise<DirectoryReadReturn | undefined>;
    createDirectory(path: string): Promise<boolean>;
    readFile(path: string, onProgress?: FilesystemProgressCallback): Promise<ArrayBuffer | undefined>;
    writeFile(path: string, data: Blob, onProgress?: FilesystemProgressCallback): Promise<boolean>;
    tree(path: string): Promise<RecursiveDirectoryReadReturn | undefined>;
    copyItem(source: string, destination: string): Promise<boolean>;
    moveItem(source: string, destination: string): Promise<boolean>;
    deleteItem(path: string): Promise<boolean>;
    direct(path: string): Promise<string | undefined>;
    quota(): Promise<UserQuota>;
    bulk<T = any>(path: string, extension: string): Promise<Record<string, T>>;
    stat(path: string): Promise<FilesystemStat | undefined>;
    isCapable(capability: DriveCapabilities): void;
    tryIsCapable(capability: DriveCapabilities): boolean;
    imageThumbnail(path: string, width: number, height?: number): Promise<string | undefined>;
  }
  
  export interface IFilesystemProxy {
    uuid: string;
    readonly displayName?: string;
    readDir(path: string): Promise<DirectoryReadReturn | undefined>;
    readFile(path: string, onProgress?: FilesystemProgressCallback): Promise<ArrayBuffer | undefined>;
  }
  
  export interface IFilesystemProxyConstructor extends Constructs<IFilesystemProxy, [string]> {
    PROXY_UUID: string;
  }

  /// SOURCE FILE: src/interfaces/ICustomTitlebar.ts ///

  export interface ICustomTitlebar {
    render(target: HTMLElement): void;
    dispose(): void;
    getTarget(): HTMLElement | undefined;
    getTitlebar(): HTMLDivElement | undefined;
  }

  /// SOURCE FILE: src/interfaces/IConfigurator.ts ///

  export interface IConfigurator<T = object> {
    readConfiguration(): Promise<T>;
    writeConfiguration(configuration?: T): Promise<T>;
    initialize(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/ICommandResult.ts ///

  export interface ICommandResult<T = any> {
    result: T | undefined;
    error?: Error;
    errorMessage?: string;
    successMessage?: string;
    success: boolean;
  }
  
  export interface ICommandResultConstructor extends Constructs<ICommandResult> {
    Ok<T>(value: T, successMessage?: string): ICommandResult<T>;
    Error<T = any>(errorMessage: string): ICommandResult<T>;
  
    new <T>(result?: T, options?: CommandResultOptions): ICommandResult<T>;
  }

  /// SOURCE FILE: src/interfaces/IArcTerminal.ts ///

  export interface IArcTerminal extends IProcess {
    readonly CONFIG_PATH: string;
    IS_ARCTERM_MODE: boolean;
    lastLine?: string;
    path: string;
    drive: IFilesystemDrive | undefined;
    term: Terminal;
    terminalMode?: ITerminalMode;
    rl: Readline | undefined;
    var: IArcTermVariables | undefined;
    contents: DirectoryReadReturn | undefined;
    daemon: IUserDaemon | undefined;
    ansiEscapes: typeof ansiEscapes;
    lastCommandErrored: boolean;
    config: ArcTermConfiguration;
    configProvidedExternal: boolean;
    window: ITerminalWindowRuntime | undefined;
    start(): Promise<false | void>;
    readline(): Promise<void>;
    processLine(text: string | undefined): Promise<void>;
    join(path?: string): string;
    readDir(path?: string): Promise<DirectoryReadReturn | undefined>;
    createDirectory(path: string): Promise<boolean | undefined>;
    writeFile(path: string, data: Blob): Promise<boolean | undefined>;
    tree(path: string): Promise<RecursiveDirectoryReadReturn | undefined>;
    copyItem(source: string, destination: string): Promise<boolean | undefined>;
    moveItem(source: string, destination: string): Promise<boolean | undefined>;
    readFile(path: string): Promise<ArrayBuffer | undefined>;
    deleteItem(path: string): Promise<boolean | undefined>;
    Error(message: string, prefix?: string): Promise<void>;
    Warning(message: string, prefix?: string): Promise<void>;
    Info(message: string, prefix?: string): Promise<void>;
    changeDirectory(path: string): Promise<boolean | undefined>;
    parseFlags(args: string): [Arguments, string];
    stop(): Promise<any>;
    elevate(data: ElevationData): Promise<boolean>;
    readConfig(): Promise<void>;
    writeConfig(): Promise<void>;
    reload(): Promise<void>;
    tryGetTermWindow(): void;
    migrateConfigurationPath(): Promise<void>;
    handleCommandError(e: Error, command: Constructs<ITerminalProcess>): void;
  }
  
  export interface ITerminalWindowRuntime extends IAppProcess {
    term: Terminal | undefined;
    overridePopulatable: boolean;
    start(): Promise<void>;
    render(): Promise<void>;
  }
  
  export interface ITerminalProcess extends IProcess {
    _main(term: IArcTerminal, flags: Arguments, argv: string[]): Promise<any>;
  }
  
  export interface ITerminalProcessConstructor extends Constructs<ITerminalProcess> {
    keyword: string;
    description: string;
    hidden: boolean;
    allowInterrupt: boolean;
  }
  
  export interface IArcTermVariables {
    term: IArcTerminal;
    getAll(): StaticVariableStore;
    get(key: string): string | undefined;
    set(key: string, value: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    replace(str: string): string;
  }
  
  export interface ITerminalMode extends IProcess {
    userDaemon?: IUserDaemon;
    target: HTMLDivElement;
    term?: Terminal;
    rl?: Readline;
    arcTerm?: IArcTerminal;
    initializeTerminal(): Promise<void>;
    proceed(username: string, password: string): Promise<boolean>;
    startDaemon(token: string, username: string): Promise<boolean>;
    resetCookies(): void;
    serverPrompt(): Promise<boolean>;
    loginPrompt(clear?: boolean): Promise<boolean>;
    askForTotp(token: string): Promise<boolean>;
  }

  /// SOURCE FILE: src/interfaces/IAppRenderer.ts ///

  export interface IAppRenderer extends IProcess {
    currentState: number[];
    target: HTMLDivElement;
    maxZIndex: number;
    focusedPid: ReadableStore<number>;
    appStore: ReadableStore<Map<string, AppProcessData>>;
    lastInteract?: IAppProcess;
    _criticalProcess: boolean;
    disposedCheck(): void;
    render(process: IAppProcess, renderTarget: HTMLDivElement | undefined): Promise<void>;
    _windowClasses(proc: IAppProcess, window: HTMLDivElement, data: App): void;
    _windowEvents(proc: IAppProcess, window: HTMLDivElement, titlebar: HTMLDivElement | undefined, data: App): void;
    focusPid(pid: number): void;
    _renderTitlebar(process: IAppProcess): HTMLDivElement | undefined;
    _renderAltMenu(process: IAppProcess): HTMLDivElement;
    _resizeGrabbers(process: IAppProcess, window: HTMLDivElement): undefined;
    _resizer(window: HTMLDivElement, resizer: WindowResizer): HTMLDivElement;
    remove(pid: number): Promise<void>;
    toggleMaximize(pid: number): void;
    updateDraggableDisabledState(pid: number, window: HTMLDivElement): void;
    unMinimize(pid: number): void;
    unsnapWindow(pid: number, dispatch?: boolean): void;
    snapWindow(pid: number, variant: string): void;
    toggleMinimize(pid: number): void;
    toggleFullscreen(pid: number): void;
    getAppInstances(id: string, originPid?: number): IAppProcess[];
    notifyCrash(data: App, reason: any, process?: IAppProcess): Promise<void>;
    centerWindow(proc: IAppProcess): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/IAppProcess.ts ///

  export interface IAppProcess extends IProcess {
    crashReason: string;
    windowTitle: ReadableStore<string>;
    windowIcon: ReadableStore<string>;
    app: AppProcessData;
    componentMount: Record<string, any>;
    userPreferences: ReadableStore<UserPreferences>;
    username: string;
    overridePopulatable: boolean;
    toastMessage: ReadableStore<ToastMessage | undefined>;
    safeMode: boolean;
    renderArgs: RenderArgs;
    acceleratorStore: AppKeyCombinations;
    readonly contextMenu: AppContextMenu;
    altMenu: ReadableStore<ContextMenuItem[]>;
    windowFullscreen: ReadableStore<boolean>;
    draggable: Draggable | undefined;
    blinking: ReadableStore<boolean>;
    onClose(): Promise<boolean>;
    ShowToast(toast: ToastMessage, durationMs?: number): Promise<void>;
    HideToast(): Promise<void>;
    closeWindow(kill?: boolean): Promise<boolean | void>;
    render(args: RenderArgs): MaybePromise<any>;
    __render__(body: HTMLDivElement): Promise<void>;
    CrashDetection(): Promise<void>;
    getSingleton(): this[];
    closeIfSecondInstance(): Promise<this | undefined>;
    getWindow(): HTMLDivElement;
    getBody(): HTMLDivElement;
    hasOverlays(): boolean;
    startAcceleratorListener(): void;
    stopAcceleratorListener(): void;
    __stop(): Promise<any>;
    unfocusActiveElement(): void;
    spawnOverlay(id: string, ...args: any[]): Promise<boolean>;
    spawnApp<T extends IAppProcess = IAppProcess>(
      id: string,
      parentPid?: number | undefined,
      ...args: any[]
    ): Promise<T | undefined>;
    spawnOverlayApp<T extends IAppProcess = IAppProcess>(
      id: string,
      parentPid?: number | undefined,
      ...args: any[]
    ): Promise<T | undefined>;
    elevate(id: string): Promise<unknown>;
    appStore(): IApplicationStorage;
    getIcon(id: string): Promise<string>;
    getIconCached(id: string): string;
    getIconStore(id: string): ReadableStore<string>;
    blink(): void;
  }
  
  export interface IAppProcessConstructor extends Constructs<IAppProcess> {
    spawnOptions?: AppProcessSpawnOptions;
  }

  /// SOURCE FILE: src/types/user/wallpaper.ts ///

  export interface Wallpaper {
    author: string;
    name: string;
    source?: string;
    url: string;
    thumb: string;
    builtin?: boolean;
  }

  /// SOURCE FILE: src/types/user/theme.ts ///

  export interface UserTheme {
    author: string;
    version: string;
    name: string;
    /** */
    taskbarLabels: boolean;
    taskbarDocked: boolean;
    taskbarColored: boolean;
    noAnimations: boolean;
    sharpCorners: boolean;
    compactContext: boolean;
    noGlass: boolean;
    desktopWallpaper: string;
    desktopTheme: string;
    desktopAccent: string;
    loginBackground?: string;
  }
  
  export type UserThemeNoMeta = Omit<Omit<Omit<UserTheme, "author">, "version">, "name">;
  
  export type ThemeStore = { [key: string]: UserTheme };

  /// SOURCE FILE: src/types/user/theme.ts ///

  export enum ExportLocalWallpaperResolution {
    NoSave,
    SaveLocal,
    SaveWithoutLocal,
  }

  /// SOURCE FILE: src/types/user/index.ts ///

  export interface UserInfo {
    username: string;
    preferences: UserPreferences;
    admin: boolean;
    adminScopes: string[];
    approved: boolean;
    _id: string;
    email: string;
    updatedAt: string;
    createdAt: string;
    hasTotp: boolean;
    isSystem: boolean;
    restricted: boolean;
    storageSize: number;
  }
  
  export type UserPreferencesStore = ReadableStore<UserPreferences>;
  
  export interface UserPreferences {
    shell: ShellPreferences;
    security: SecurityPreferences;
    appPreferences: ApplicationPreferences;
    account: AccountSettings;
    isDefault?: boolean;
    firstRunDone?: boolean;
    desktop: DesktopPreferences;
    userThemes: ThemeStore;
    userWallpapers: Record<string, Wallpaper>;
    userApps: Record<string, App>;
    currentThemeId?: string;
    searchOptions: ArcFindOptions;
    pinnedApps: string[];
    disabledApps: string[];
    workspaces: WorkspacesOptions;
    globalSettings: Record<string, any>;
    startup?: Record<string, "app" | "file" | "folder" | "share" | "disabled">;
    _internalImportBlocklist: string[];
    enableVerboseLogin?: boolean;
  }
  
  export type ExpandedUserInfo = UserInfo & { profile: PublicUserInfo };
  
  export interface WorkspacesOptions {
    desktops: Workspace[];
    index: number;
  }
  
  export interface Workspace {
    name?: string;
    uuid: string;
  }
  
  export interface ArcFindOptions {
    includeFilesystem: boolean;
    includeSettingsPages: boolean;
    includeApps: boolean;
    includePower: boolean;
    cacheFilesystem: boolean;
    showHiddenApps: boolean;
    showThirdPartyApps: boolean;
    excludeShortcuts: boolean;
  }
  
  export interface CustomStylePreferences {
    enabled: boolean;
    content?: string;
  }
  
  export interface ShellPreferences {
    taskbar: TaskbarPreferences;
    start: StartMenuPreferences;
    visuals: VisualPreferences;
    customStyle: CustomStylePreferences;
    actionCenter: {
      weatherLocation: {
        latitude: number;
        longitude: number;
        name?: string;
      };
      noteContent: string;
      galleryImage: string;
      cardIndex: number;
      hideQuickSettings: boolean;
    };
  }
  
  export interface TaskbarPreferences {
    labels: boolean;
    docked: boolean;
    colored: boolean;
    clockSecs: boolean;
    clockDate: boolean;
    clock12hr: boolean;
    batteryPercentage: boolean;
    openedAppsPerWorkspace?: boolean;
    accentedStartButton?: boolean;
  }
  
  export interface DesktopPreferences {
    wallpaper: string;
    icons: boolean;
    theme: "light" | "dark" | string;
    sharp: boolean;
    accent: string;
    noIconGrid: boolean;
    lockIcons: boolean;
    nativeNotificationsState?: NotificationPermission;
  }
  
  export interface StartMenuPreferences {
    noGroups: boolean;
    actions: string[];
  }
  
  export interface VisualPreferences {
    noAnimations: boolean;
    sharpCorners: boolean;
    compactContext: boolean;
    showHiddenApps: boolean;
    noGlass: boolean;
    userFont?: string;
    trafficLights: boolean;
    blurRadius: number;
    hideAltmenus?: boolean;
  }
  
  export interface SecurityPreferences {
    lockdown: boolean;
    noPassword: boolean;
    disabled: boolean;
    enableThirdParty: boolean;
    restrictSystemFolders: boolean;
  }
  
  export interface AccountSettings {
    profilePicture: string | number | null;
    loginBackground: string;
    displayName?: string;
  }
  
  export interface ApplicationPreferences {
    experiments: { [key: string]: boolean };
    [key: string]: ScopedAppData;
  }
  
  export type ScopedAppData = {
    [key: string]: any;
  };
  
  export type WallpaperGetters = [string, (id: string) => Wallpaper | Promise<Wallpaper>][];
  
  export type PasswordStrength = "tooWeak" | "weak" | "medium" | "strong";
  
  export interface TotpSetupResponse {
    url: string;
  }
  
  export interface PublicUserInfo {
    username: string;
    displayName?: string;
    profilePicture: string;
    admin: boolean;
    dispatchClients: number;
  }
  
  export interface CategorizedDiskUsage {
    sizes: {
      system: number;
      trash: number;
      home: number;
      apps: number;
    };
    absolutePercentages: {
      system: number;
      trash: number;
      home: number;
      apps: number;
    };
    relativePercentages: {
      system: number;
      trash: number;
      home: number;
      apps: number;
    };
    used: number;
    free: number;
    total: number;
  }
  

  /// SOURCE FILE: src/types/user/activity.ts ///

  export interface LoginActivity {
    authorId: string;
    token?: string;
    userAgent: string;
    location?: Location;
    action: "unknown" | "login" | "logout";
    _id: string;
    createdAt: string;
    updatedAt: string;
  }

  /// SOURCE FILE: src/types/tpa/package.ts ///

  export interface ArcPackage {
    _id?: string;
    name: string;
    author: string;
    version: string;
    description: string;
    installLocation:
      | `U:/Applications/${string}` // type === "app"
      | `U:/System/Libraries/${string}`; // type === "library"
    appId: string;
    store?: {
      image?: string;
      screenshots?: string[];
      banner?: string;
      category?: string;
    };
    dependencies?: string[];
    type: "app" | "library";
  }
  
  export interface StoreItem {
    name: string;
    userId: string;
    user?: PublicUserInfo;
    pkg: ArcPackage;
    _id: string;
    official: boolean;
    installCount: number;
    lastUpdated: number;
    blocked: boolean;
    size: number;
    createdAt: string;
    updatedAt: string;
    deprecated: boolean;
    description: string;
    verifiedBy?: string;
    verifiedVer?: string;
    verifiedNote?: string;
    verificationAgent?: PublicUserInfo;
  }
  
  export interface PartialStoreItem {
    _id: string;
    name: string;
    userId: string;
    user?: PublicUserInfo;
    pkg: ArcPackage;
    official: boolean;
    installCount: number;
    lastUpdated: number;
    store?: {
      image?: string;
      screenshots?: string[];
      banner?: string;
      category?: string;
    };
    description: string;
    blocked: boolean;
    size: number;
    createdAt: string;
    updatedAt: string;
    deprecated: boolean;
    verifiedBy?: string;
    verifiedVer?: string;
    verifiedNote?: string;
    verificationAgent?: PublicUserInfo;
  }
  
  export type InstallStatusType = "mkdir" | "file" | "registration" | "other";
  export type InstallStatusMode = "done" | "failed" | "working";
  
  export interface InstallStatusItem {
    type: InstallStatusType;
    status: InstallStatusMode;
    content: string;
  }
  
  export type InstallStatus = Record<string, InstallStatusItem>;
  
  export interface UpdateInfo {
    name: string;
    oldVer: string;
    newVer: string;
    pkg: StoreItem;
  }

  /// SOURCE FILE: src/types/tpa/libraries.ts ///

  export interface TpaLibrary {
    identifier: string;
    author: string;
    version: string;
    entrypoint: `U:/System/Libraries/${string}`;
  }

  /// SOURCE FILE: src/types/system/shortcut.ts ///

  export interface ArcShortcut {
    icon: string;
    name: string;
    type: "folder" | "file" | "app" | "new";
    target: string; // U:/Music, U:/testapp/main.tpa, fileManager
  }
  
  export type ShortcutStore = Record<string, ArcShortcut>;

  /// SOURCE FILE: src/types/system/process.ts ///

  export interface ProcessContext {
    pid: number;
    userId: string | "SYSTEM";
    appId?: string;
  }
  
  export type RenderArgs = Record<string, any>;
  export type ProcessSpawnResult = "success" | "err_disabled" | "err_aboveLimit";
  export type ProcessKillResult =
    | "success"
    | "err_elevation"
    | "err_criticalProcess"
    | "err_disposed"
    | "err_noExist"
    | "err_killCancel";
  
  export type ProcessState = "unknown" | "starting" | "running" | "stopping" | "error" | "constructing" | "disposed" | "rendering";
  

  /// SOURCE FILE: src/types/system/navigator.ts ///

  export interface BatteryType {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    onchargingchange: number | null;
    onchargingtimechange: number | null;
    ondischargingtimechange: number | null;
    onlevelchange: number | null;
  }

  /// SOURCE FILE: src/types/system/fs.ts ///

  export interface FileEntry {
    name: string;
    size: number;
    dateCreated: Date;
    dateModified: Date;
    mimeType: string;
    itemId: string;
    shortcut?: ArcShortcut;
    action?: () => void;
    modifiers?: SummarizedFsModifiers;
  }
  
  export interface FsAccess {
    _id?: string;
    userId: string;
    shareId?: string;
    path: string;
    accessor: string;
    createdAt?: Date;
  }
  
  export type PathedFileEntry = FileEntry & { path: string };
  
  export type FullFileEntry = FileEntry & {
    data: Blob;
  };
  
  export interface FolderEntry {
    name: string;
    dateCreated: Date;
    dateModified: Date;
    itemId: string;
    modifiers?: SummarizedFsModifiers;
  }
  
  export interface DirectoryReadReturn {
    dirs: FolderEntry[];
    files: FileEntry[];
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
    shortcuts: ShortcutStore;
  }
  
  export interface RecursiveDirectoryReadReturn {
    dirs: RecursiveDirectory[];
    files: FileEntry[];
    shortcuts: ShortcutStore;
  }
  
  export type RecursiveDirectory = FolderEntry & {
    children: RecursiveDirectoryReadReturn;
  };
  
  export interface UserQuota extends Record<string, number | boolean | undefined> {
    used: number;
    max: number;
    free: number;
    percentage: number;
    unknown?: boolean;
  }
  
  export interface SingleUploadReturn {
    path: string;
    file: File;
    content: Blob;
  }
  
  export type UploadReturn = SingleUploadReturn[];
  
  export interface FilesystemProgress {
    type: "size" | "items" | "percentage";
    max: number;
    value: number;
    what?: string;
  }
  
  export type FilesystemProgressCallback = (progress: FilesystemProgress) => void;
  
  export interface FileHandler {
    isHandler: true;
    name: string;
    description: string;
    icon: string;
    hidden?: boolean;
    opens: {
      extensions?: string[];
      mimetypes?: string[];
    };
    handle: (path: string) => void;
  }
  
  export interface FileOpenerResult {
    type: "handler" | "app";
    app?: App;
    handler?: FileHandler;
    id: string;
  }
  
  export type DriveCapabilities =
    | "readDir"
    | "makeDir"
    | "readFile"
    | "writeFile"
    | "copyItem"
    | "moveItem"
    | "deleteItem"
    | "tree"
    | "direct"
    | "bulk"
    | "stat"
    | "quota";
  
  export interface FilesystemStat {
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    created: number;
    modified: number;
  }
  
  export interface FsModifier {
    _id?: string;
    userId: string;
    itemId: string;
    kind: FsModifierKind;
    isAdmin?: boolean;
    isDir?: boolean;
    createdAt?: string;
    modifiedAt?: string;
  }
  
  export interface ExtendedFsModifier extends FsModifier {
    user?: PublicUserInfo;
  }
  
  export interface SummarizedFsModifiers {
    itemId: string;
    lastWrite: ExtendedFsModifier | null;
    createdBy: ExtendedFsModifier | null;
  }
  
  export type FsModifierKind = "create" | "write";
  
  export interface FsModifierOptions {
    kind: FsModifierKind;
    isAdmin?: boolean;
    isDir?: boolean;
  }
  
  export interface ExtendedStat extends FilesystemStat {
    modifiers?: SummarizedFsModifiers;
  }
  
  export interface FsProxyInfo {
    prefix: string;
    proxyUuid: string;
    proxyHandler: IFilesystemProxy;
    path: string;
    displayName?: string;
  }
  
  export type RecyclingStrategy = "cancel" | "recycle" | "incinerate";

  /// SOURCE FILE: src/types/system/elevation.ts ///

  export interface ElevationData {
    what: string;
    image: string;
    title: string;
    description: string;
    level: ElevationLevel;
  }
  
  export enum ElevationLevel {
    low,
    medium,
    high,
  }

  /// SOURCE FILE: src/types/system/dispatch.ts ///

  export type DispatchCallback = (...args: any[]) => any;
  export type SystemDispatchResult = "success" | "err_systemOnly" | "err_unknownCaller";
  
  export interface GlobalDispatchClient {
    socketId: string;
    userId: string;
    authorized: boolean;
    ip?: string;
  }

  /// SOURCE FILE: src/types/system/assoc.ts ///

  export interface FileDefinition {
    friendlyName: string;
    icon: string; // maybeIconId()
  }
  
  export interface FileAssociationConfig {
    associations: {
      apps: Record<string, string[]>;
      handlers: Record<string, string[]>;
    };
    definitions: Record<string, FileDefinition>;
  }
  
  export interface BaseFileAssociationInfo {
    extension: string;
    handledBy?: {
      app?: string;
      handler?: string;
    };
    icon?: string;
    friendlyName?: string;
  }
  
  export interface ExpandedFileAssociationInfo {
    extension: string;
    handledBy: {
      app?: App;
      handler?: FileHandler;
    };
    icon: string;
    friendlyName: string;
  }

  /// SOURCE FILE: src/types/shared/writable.ts ///

  /** Callback to inform of a value updates. */
  export type Subscriber<T> = (value: T) => void;
  
  /** Unsubscribes from value updates. */
  export type Unsubscriber = () => void;
  
  /** Callback to update a value. */
  export type Updater<T> = (value: T) => T;
  /** Readable interface for subscribing. */
  export interface Readable<T> {
    /**
     * Subscribe on value changes.
     * @param run subscription callback
     * @param invalidate cleanup callback
     */
    subscribe(this: void, run: Subscriber<T>, invalidate?: () => void): Unsubscriber;
  }
  
  /** Writable interface for both updating and subscribing. */
  export interface Writable<T> extends Readable<T> {
    /**
     * Set value and inform subscribers.
     * @param value to set
     */
    set(this: void, value: T): void;
  
    /**
     * Update value using callback and inform subscribers.
     * @param updater callback
     */
    update(this: void, updater: Updater<T>): void;
  }
  
  export type ReadableStore<T> = Writable<T> & { (): T; get: () => T };
  export type BooleanStore = ReadableStore<boolean>;
  export type StringStore = ReadableStore<string>;
  export type NumberStore = ReadableStore<number>;

  /// SOURCE FILE: src/types/shared/result.ts ///

  export interface CommandResultOptions {
    errorMessage?: string;
    successMessage?: string;
    success?: boolean;
  }

  /// SOURCE FILE: src/types/shared/messagebox.ts ///

  export interface MessageBoxData {
    title: string;
    message?: string;
    content?: Component<any>;
    buttons: MessageBoxButton[];
    image?: string; // ICON ID!!!
    sound?: string;
  }
  
  export interface MessageBoxButton {
    caption: string;
    action: () => MaybePromise<void | false>;
    disabled?: () => MaybePromise<boolean>;
    hide?: () => MaybePromise<boolean>;
    suggested?: boolean;
  }
  
  export type ConfirmationData = Omit<MessageBoxData, "buttons">;

  /// SOURCE FILE: src/types/shared/logging.ts ///

  export interface LogItem {
    source: string;
    message: string;
    timestamp: number;
    level: LogLevel;
    kernelTime: number;
  }
  
  export enum LogLevel {
    info,
    warning,
    error,
    critical,
  }

  /// SOURCE FILE: src/types/shared/common.ts ///

  export type MaybePromise<T> = T | Promise<T>;
  export type IntBool = 1 | 0;

  /// SOURCE FILE: src/types/services/tray.ts ///

  export interface ShellTrayIcon {
    pid: number;
    identifier: string;
    popup?: TrayPopup;
    icon: string;
    context?: ContextMenuItem[];
    action?: (targetedProcess: IProcess) => void;
  }
  
  export interface TrayIconOptions {
    popup?: TrayPopup;
    icon: string;
    context?: ContextMenuItem[];
    action?: (targetedProcess: IProcess) => void;
  }
  
  export interface TrayPopup {
    component?: Component;
    width: number;
    height: number;
    className?: string;
  }
  
  export type TrayIconDiscriminator = `${number}#${string}`;

  /// SOURCE FILE: src/types/services/trash.ts ///

  export interface TrashIndexNode {
    name: string;
    icon: string;
    originalPath: string;
    deletedPath: string;
    timestamp: number;
  }

  /// SOURCE FILE: src/types/services/service.ts ///

  export interface Service {
    name: string;
    description: string;
    process: Constructs<IBaseService>;
    startCondition?: (daemon: IUserDaemon) => MaybePromise<boolean>;
    pid?: number;
    id?: string;
    initialState?: InitialServiceState;
    loadedAt?: number;
    changedAt?: number;
  }
  
  export type ServiceStore = Map<ServiceIdentifier, Service>;
  export type ReadableServiceStore = ReadableStore<ServiceStore>;
  export type InitialServiceState = "stopped" | "started";
  export type ServiceChangeResult =
    | "err_noExist"
    | "err_alreadyRunning"
    | "err_notRunning"
    | "err_startCondition"
    | "err_spawnFailed"
    | "err_noManager"
    | "err_elevation"
    | "err_managerPaused"
    | "success";

  /// SOURCE FILE: src/types/services/search.ts ///

  export interface SearchItem {
    caption: string;
    action: (item?: SearchItem) => MaybePromise<void>;
    image?: string; // icon ID!!!
    description?: string;
  }
  
  export type SearchProvider = () => Promise<SearchItem[]> | SearchItem[];

  /// SOURCE FILE: src/types/services/proto.ts ///

  export interface ArcProtocol {
    subCommand: string;
    command: string;
    payload: Record<string, any>;
    path: string;
  }
  
  export interface SpawnAppProtocol extends ArcProtocol {
    subCommand: "";
    command: "spawn_app";
    payload: {
      id: string;
      args: any[];
    };
    path: "/";
  }
  
  export interface ProtocolHandler {
    name: string;
    className?: string;
    info: (payload: Record<string, any>, daemon: IUserDaemon) => { icon: string; caption: string; title?: string } | undefined;
    action: (payload: Record<string, any>, daemon: IUserDaemon, proto: ArcProtocol) => MaybePromise<boolean>;
  }

  /// SOURCE FILE: src/types/services/migrations.ts ///

  export interface MigrationStatusItem {
    caption: string;
    migration: IMigrationNode;
  }
  
  export interface MigrationResult {
    result: MigrationResultStatus;
    errorMessage?: string;
    successMessage?: string;
    duration?: number;
  }
  
  export type MigrationResultCollection = Record<number, MigrationResult>;
  
  export type MigrationStatusCallback = (caption: string) => void;
  export type MigrationResultStatus = "err_ok" | "err_failure" | "err_conflict" | "err_denied" | "err_sameVersion" | "err_noop";

  /// SOURCE FILE: src/types/services/devenv.ts ///

  export interface ProjectMetadata {
    metadata: ArcPackage;
    devPort?: number;
    repository?: string;
    outFile: string;
    payloadDir: string;
    buildHash?: string;
    noHotRelaunch?: boolean;
  }
  
  export type DevEnvActivationResult =
    | "success"
    | "ping_failed"
    | "port_mismatch"
    | "build_mismatch"
    | "already_connected"
    | "websock_failed"
    | "drivemnt_failed";

  /// SOURCE FILE: src/types/server/shares.ts ///

  export interface SharedDriveType {
    userId: string;
    accessors: string[];
    shareName: string;
    maxSize: number;
    passwordHash: string;
    description?: string;
    locked: boolean;
    ownerName?: string;
    _id: string;
  }
  
  export interface ShareCreateOptions {
    userId: string;
    description?: string;
    size?: number;
    shareName: string;
    password: string;
  }

  /// SOURCE FILE: src/types/server/messaging.ts ///

  export interface Message {
    authorId: string; // userId
    title: string;
    body: string;
    recipient: string; // userId[]
    attachments?: string[]; // attachmentId[]
    _id: string;
    repliesTo?: string;
    correlationId: string;
    createdAt: string;
    updatedAt: string;
    read: boolean;
  }
  
  export interface MessageCreateData {
    title: string;
    body: string;
    recipients: string[];
    attachments: File[];
  }
  
  export interface ExpandedMessage extends Message {
    attachmentData?: MessageAttachment[];
    author?: PublicUserInfo;
    recipientData?: PublicUserInfo;
  }
  
  export interface ExpandedMessageNode extends ExpandedMessage {
    replies: ExpandedMessageNode[];
  }
  
  export interface MessageAttachment {
    filename: string;
    size: number;
    mimeType: string;
    realPath: string; // /attachments/*
    signature: string; // sha256
    _id: string;
  }

  /// SOURCE FILE: src/types/server/index.ts ///

  export interface ServerInfo {
    validation: string;
    status: string;
    loginWallpaper: boolean;
    loginBottomText: string;
    loginNotice: string;
    disableRegistration: boolean;
    freshBackend: boolean;
    rejectTargetedAuthorization: boolean;
    noEmailVerify: boolean;
  }
  
  export interface ServerOption {
    url: string;
    authCode?: string;
    name?: string;
    system?: boolean;
    icon?: string;
  }

  /// SOURCE FILE: src/types/server/bughunt.ts ///

  export interface BugReport {
    authorId?: string;
    title: string;
    body: string;
    logs: LogItem[];
    closed: boolean;
    version: `${number}.${number}.${number}`;
    location: Location;
    userData?: Record<string, any>;
    userAgent?: string;
    api?: string;
    frontend: string;
    meta: MetaEnvironment;
    env: Record<string, string>;
    _id?: string;
    createdAt: string;
    mode: string;
    build: string;
    public: boolean;
    isAppReport?: boolean;
    reportAppId?: string;
    reportAppPkgId?: string;
  }
  
  export interface OutgoingBugReport {
    title: string;
    body: string;
    logs: LogItem[];
    version: `${number}.${number}.${number}`;
    location: Location;
    userAgent?: string;
    api?: string;
    frontend: string;
    meta: MetaEnvironment;
    mode: string;
    build: string;
    public?: boolean;
    isAppReport?: boolean;
    reportAppId?: string;
    reportAppPkgId?: string;
  }
  
  export interface Location {
    hash: string;
    host: string;
    hostname: string;
    href: string;
    origin: string;
    pathname: string;
    port: string;
    protocol: string;
    search: string;
  }
  
  export interface MetaEnvironment {
    BASE_URL: string;
    MODE: string;
    DEV: boolean;
    PROD: boolean;
    SSR: boolean;
    DW_SERVER_URL?: string;
    DW_SERVER_AUTHCODE?: string;
  }
  
  export interface ReportStatistics extends Record<string, number> {
    opened: number;
    closed: number;
    total: number;
    apis: number;
  }
  
  export interface ReportOptions {
    title: string;
    body?: string;
    noLogs?: boolean;
    anonymous?: boolean;
    public?: boolean;
  }
  
  export interface BugHuntProc extends IAppProcess {
    invalidateCaches: (restoreSelected?: boolean) => Promise<void>;
  }

  /// SOURCE FILE: src/types/libraries/error.ts ///

  export interface ParsedStackUrl {
    userId?: string;
    timestamp?: string;
    appId?: string;
    filename?: string;
  }
  
  export type ParsedStackFrame = StackFrame & {
    parsed?: ParsedStackUrl;
  };
  
  export interface StackFrame {
    file: string | null;
    methodName: LiteralUnion<"<unknown>", string>;
    arguments: string[];
    lineNumber: number | null;
    column: number | null;
  }
  

  /// SOURCE FILE: src/types/libraries/draggable.ts ///

  type DragBoundsCoords = {
    /** Number of pixels from left of the document */
    left: number;
    /** Number of pixels from top of the document */
    top: number;
    /** Number of pixels from the right side of document */
    right: number;
    /** Number of pixels from the bottom of the document */
    bottom: number;
  };
  type DragAxis = "both" | "x" | "y" | "none";
  type DragBounds = HTMLElement | Partial<DragBoundsCoords> | "parent" | "body" | (string & Record<never, never>);
  type DragEventData = {
    /** How much element moved from its original position horizontally */
    offsetX: number;
    /** How much element moved from its original position vertically */
    offsetY: number;
    /** The node on which the draggable is applied */
    rootNode: HTMLElement;
    /** The element being dragged */
    currentNode: HTMLElement;
    /** The pointer event that triggered the drag */
    event: PointerEvent;
  };
  type DragOptions = {
    /**
     * Optionally limit the drag area
     *
     * Accepts `parent` as prefixed value, and limits it to its parent.
     *
     * Or, you can specify any selector and it will be bound to that.
     *
     * **Note**: We don't check whether the selector is bigger than the node element.
     * You yourself will have to make sure of that, or it may lead to strange behavior
     *
     * Or, finally, you can pass an object of type `{ top: number; right: number; bottom: number; left: number }`.
     * These mimic the css `top`, `right`, `bottom` and `left`, in the sense that `bottom` starts from the bottom of the window, and `right` from right of window.
     * If any of these properties are unspecified, they are assumed to be `0`.
     */
    bounds?: DragBounds;
    /**
     * When to recalculate the dimensions of the `bounds` element.
     *
     * By default, bounds are recomputed only on dragStart. Use this options to change that behavior.
     *
     * @default '{ dragStart: true, drag: false, dragEnd: false }'
     */
    recomputeBounds?: {
      dragStart?: boolean;
      drag?: boolean;
      dragEnd?: boolean;
    };
    /**
     * Axis on which the element can be dragged on. Valid values: `both`, `x`, `y`, `none`.
     *
     * - `both` - Element can move in any direction
     * - `x` - Only horizontal movement possible
     * - `y` - Only vertical movement possible
     * - `none` - No movement at all
     *
     * @default 'both'
     */
    axis?: DragAxis;
    /**
     * If false, uses the new translate property instead of transform: translate(); to move the element around.
     *
     * At present this is true by default, but will be changed to false in a future major version.
     *
     * @default false
     * @deprecated Use `transform` option instead for transform: translate() or any other custom transform. Will be removed in v3.
     */
    legacyTranslate?: boolean;
    /**
     * If true, uses `translate3d` instead of `translate` to move the element around, and the hardware acceleration kicks in.
     *
     * `true` by default, but can be set to `false` if [blurry text issue](https://developpaper.com/question/why-does-the-use-of-css3-translate3d-result-in-blurred-display/) occur
     *
     * @default true
     * @deprecated Use `transform` option instead with translate(x, y, 1px). 1px forces some browsers to use GPU acceleration. Will be removed in v3
     */
    gpuAcceleration?: boolean;
    /**
     * Custom transform function. If provided, this function will be used to apply the DOM transformations to the root node to move it.
     * Existing transform logic, including `gpuAcceleration` and `legacyTranslate`, will be ignored.
     *
     * You can return a string to apply to a `transform` property, or not return anything and apply your transformations using `rootNode.style.transform = VALUE`
     *
     * @default undefined
     */
    transform?: ({
      offsetX,
      offsetY,
      rootNode,
    }: {
      offsetX: number;
      offsetY: number;
      rootNode: HTMLElement;
    }) => string | undefined | void;
    /**
     * Applies `user-select: none` on `<body />` element when dragging,
     * to prevent the irritating effect where dragging doesn't happen and the text is selected.
     * Applied when dragging starts and removed when it stops.
     *
     * Can be disabled using this option
     *
     * @default true
     */
    applyUserSelectHack?: boolean;
    /**
     * Ignores touch events with more than 1 touch.
     * This helps when you have multiple elements on a canvas where you want to implement
     * pinch-to-zoom behaviour.
     *
     * @default false
     *
     */
    ignoreMultitouch?: boolean;
    /**
     * Disables dragging altogether.
     *
     * @default false
     */
    disabled?: boolean;
    /**
     * Applies a grid on the page to which the element snaps to when dragging, rather than the default continuous grid.
     *
     * `Note`: If you're programmatically creating the grid, do not set it to [0, 0] ever, that will stop drag at all. Set it to `undefined`.
     *
     * @default undefined
     */
    grid?: [number, number];
    /**
     * Threshold for dragging to start. If the user moves the mouse/finger less than this distance, the dragging won't start.
     *
     * @default { delay: 0, distance: 3 }
     */
    threshold?: {
      /**
       * Threshold in milliseconds for a pointer movement to be considered a drag
       *
       * @default 0
       */
      delay?: number;
      /**
       * Threshold in pixels for movement to be considered a drag
       *
       * @default 3
       */
      distance?: number;
    };
    /**
     * Control the position manually with your own state
     *
     * By default, the element will be draggable by mouse/finger, and all options will work as default while dragging.
     *
     * But changing the `position` option will also move the draggable around. These parameters are reactive,
     * so using Svelte's reactive variables as values for position will work like a charm.
     *
     *
     * Note: If you set `disabled: true`, you'll still be able to move the draggable through state variables. Only the user interactions won't work
     *
     */
    position?: {
      x: number;
      y: number;
    };
    /**
     * CSS Selector of an element or multiple elements inside the parent node(on which `use:draggable` is applied).
     *
     * Can be an element or elements too. If it is provided, Trying to drag inside the `cancel` element(s) will prevent dragging.
     *
     * @default undefined
     */
    cancel?: string | HTMLElement | HTMLElement[];
    /**
     * CSS Selector of an element or multiple elements inside the parent node(on which `use:draggable` is applied). Can be an element or elements too.
     *
     * If it is provided, Only clicking and dragging on this element will allow the parent to drag, anywhere else on the parent won't work.
     *
     * @default undefined
     */
    handle?: string | HTMLElement | HTMLElement[];
    /**
     * Class to apply on the element on which `use:draggable` is applied.
     * Note that if `handle` is provided, it will still apply class on the element to which this action is applied, **NOT** the handle
     *
     */
    defaultClass?: string;
    /**
     * Class to apply on the element when it is dragging
     *
     * @default 'neodrag-dragging'
     */
    defaultClassDragging?: string;
    /**
     * Class to apply on the element if it has been dragged at least once.
     *
     * @default 'neodrag-dragged'
     */
    defaultClassDragged?: string;
    /**
     * Offsets your element to the position you specify in the very beginning.
     * `x` and `y` should be in pixels
     *
     */
    defaultPosition?: {
      x: number;
      y: number;
    };
    /**
     * Fires when dragging start
     */
    onDragStart?: (data: DragEventData) => void;
    /**
     * Fires when dragging is going on
     */
    onDrag?: (data: DragEventData) => void;
    /**
     * Fires when dragging ends
     */
    onDragEnd?: (data: DragEventData) => void;
  };
  
  export interface Draggable {
    node: HTMLElement;
    updateOptions(options: DragOptions): void;
    set options(options: DragOptions);
    get options(): DragOptions;
    destroy(): void;
  }

  /// SOURCE FILE: src/types/libraries/dayjs.ts ///

  
  export function dayjs(date?: dayjs.ConfigType): dayjs.Dayjs;
  
  export function dayjs(date?: dayjs.ConfigType, format?: dayjs.OptionType, strict?: boolean): dayjs.Dayjs;
  
  export function dayjs(date?: dayjs.ConfigType, format?: dayjs.OptionType, locale?: string, strict?: boolean): dayjs.Dayjs;
  
  export namespace dayjs {
    interface ConfigTypeMap {
      default: string | number | Date | Dayjs | null | undefined;
    }
  
    export type ConfigType = ConfigTypeMap[keyof ConfigTypeMap];
  
    export interface FormatObject {
      locale?: string;
      format?: string;
      utc?: boolean;
    }
  
    export type OptionType = FormatObject | string | string[];
  
    export type UnitTypeShort = "d" | "D" | "M" | "y" | "h" | "m" | "s" | "ms";
  
    export type UnitTypeLong = "millisecond" | "second" | "minute" | "hour" | "day" | "month" | "year" | "date";
  
    export type UnitTypeLongPlural = "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
  
    export type UnitType = UnitTypeLong | UnitTypeLongPlural | UnitTypeShort;
  
    export type OpUnitType = UnitType | "week" | "weeks" | "w";
    export type QUnitType = UnitType | "quarter" | "quarters" | "Q";
    export type ManipulateType = Exclude<OpUnitType, "date" | "dates">;
    class Dayjs {
      constructor(config?: ConfigType);
      /**
       * All Day.js objects are immutable. Still, `dayjs#clone` can create a clone of the current object if you need one.
       * ```
       * dayjs().clone()// => Dayjs
       * dayjs(dayjs('2019-01-25')) // passing a Dayjs object to a constructor will also clone it
       * ```
       * Docs: https://day.js.org/docs/en/parse/dayjs-clone
       */
      clone(): Dayjs;
      /**
       * This returns a `boolean` indicating whether the Day.js object contains a valid date or not.
       * ```
       * dayjs().isValid()// => boolean
       * ```
       * Docs: https://day.js.org/docs/en/parse/is-valid
       */
      isValid(): boolean;
      /**
       * Get the year.
       * ```
       * dayjs().year()// => 2020
       * ```
       * Docs: https://day.js.org/docs/en/get-set/year
       */
      year(): number;
      /**
       * Set the year.
       * ```
       * dayjs().year(2000)// => Dayjs
       * ```
       * Docs: https://day.js.org/docs/en/get-set/year
       */
      year(value: number): Dayjs;
      /**
       * Get the month.
       *
       * Months are zero indexed, so January is month 0.
       * ```
       * dayjs().month()// => 0-11
       * ```
       * Docs: https://day.js.org/docs/en/get-set/month
       */
      month(): number;
      /**
       * Set the month.
       *
       * Months are zero indexed, so January is month 0.
       *
       * Accepts numbers from 0 to 11. If the range is exceeded, it will bubble up to the next year.
       * ```
       * dayjs().month(0)// => Dayjs
       * ```
       * Docs: https://day.js.org/docs/en/get-set/month
       */
      month(value: number): Dayjs;
      /**
       * Get the date of the month.
       * ```
       * dayjs().date()// => 1-31
       * ```
       * Docs: https://day.js.org/docs/en/get-set/date
       */
      date(): number;
      /**
       * Set the date of the month.
       *
       * Accepts numbers from 1 to 31. If the range is exceeded, it will bubble up to the next months.
       * ```
       * dayjs().date(1)// => Dayjs
       * ```
       * Docs: https://day.js.org/docs/en/get-set/date
       */
      date(value: number): Dayjs;
      /**
       * Get the day of the week.
       *
       * Returns numbers from 0 (Sunday) to 6 (Saturday).
       * ```
       * dayjs().day()// 0-6
       * ```
       * Docs: https://day.js.org/docs/en/get-set/day
       */
      day(): 0 | 1 | 2 | 3 | 4 | 5 | 6;
      /**
       * Set the day of the week.
       *
       * Accepts numbers from 0 (Sunday) to 6 (Saturday). If the range is exceeded, it will bubble up to next weeks.
       * ```
       * dayjs().day(0)// => Dayjs
       * ```
       * Docs: https://day.js.org/docs/en/get-set/day
       */
      day(value: number): Dayjs;
      /**
       * Get the hour.
       * ```
       * dayjs().hour()// => 0-23
       * ```
       * Docs: https://day.js.org/docs/en/get-set/hour
       */
      hour(): number;
      /**
       * Set the hour.
       *
       * Accepts numbers from 0 to 23. If the range is exceeded, it will bubble up to the next day.
       * ```
       * dayjs().hour(12)// => Dayjs
       * ```
       * Docs: https://day.js.org/docs/en/get-set/hour
       */
      hour(value: number): Dayjs;
      /**
       * Get the minutes.
       * ```
       * dayjs().minute()// => 0-59
       * ```
       * Docs: https://day.js.org/docs/en/get-set/minute
       */
      minute(): number;
      /**
       * Set the minutes.
       *
       * Accepts numbers from 0 to 59. If the range is exceeded, it will bubble up to the next hour.
       * ```
       * dayjs().minute(59)// => Dayjs
       * ```
       * Docs: https://day.js.org/docs/en/get-set/minute
       */
      minute(value: number): Dayjs;
      /**
       * Get the seconds.
       * ```
       * dayjs().second()// => 0-59
       * ```
       * Docs: https://day.js.org/docs/en/get-set/second
       */
      second(): number;
      /**
       * Set the seconds.
       *
       * Accepts numbers from 0 to 59. If the range is exceeded, it will bubble up to the next minutes.
       * ```
       * dayjs().second(1)// Dayjs
       * ```
       */
      second(value: number): Dayjs;
      /**
       * Get the milliseconds.
       * ```
       * dayjs().millisecond()// => 0-999
       * ```
       * Docs: https://day.js.org/docs/en/get-set/millisecond
       */
      millisecond(): number;
      /**
       * Set the milliseconds.
       *
       * Accepts numbers from 0 to 999. If the range is exceeded, it will bubble up to the next seconds.
       * ```
       * dayjs().millisecond(1)// => Dayjs
       * ```
       * Docs: https://day.js.org/docs/en/get-set/millisecond
       */
      millisecond(value: number): Dayjs;
      /**
       * Generic setter, accepting unit as first argument, and value as second, returns a new instance with the applied changes.
       *
       * In general:
       * ```
       * dayjs().set(unit, value) === dayjs()[unit](value)
       * ```
       * Units are case insensitive, and support plural and short forms.
       * ```
       * dayjs().set('date', 1)
       * dayjs().set('month', 3) // April
       * dayjs().set('second', 30)
       * ```
       * Docs: https://day.js.org/docs/en/get-set/set
       */
      set(unit: UnitType, value: number): Dayjs;
      /**
       * String getter, returns the corresponding information getting from Day.js object.
       *
       * In general:
       * ```
       * dayjs().get(unit) === dayjs()[unit]()
       * ```
       * Units are case insensitive, and support plural and short forms.
       * ```
       * dayjs().get('year')
       * dayjs().get('month') // start 0
       * dayjs().get('date')
       * ```
       * Docs: https://day.js.org/docs/en/get-set/get
       */
      get(unit: UnitType): number;
      /**
       * Returns a cloned Day.js object with a specified amount of time added.
       * ```
       * dayjs().add(7, 'day')// => Dayjs
       * ```
       * Units are case insensitive, and support plural and short forms.
       *
       * Docs: https://day.js.org/docs/en/manipulate/add
       */
      add(value: number, unit?: ManipulateType): Dayjs;
      /**
       * Returns a cloned Day.js object with a specified amount of time subtracted.
       * ```
       * dayjs().subtract(7, 'year')// => Dayjs
       * ```
       * Units are case insensitive, and support plural and short forms.
       *
       * Docs: https://day.js.org/docs/en/manipulate/subtract
       */
      subtract(value: number, unit?: ManipulateType): Dayjs;
      /**
       * Returns a cloned Day.js object and set it to the start of a unit of time.
       * ```
       * dayjs().startOf('year')// => Dayjs
       * ```
       * Units are case insensitive, and support plural and short forms.
       *
       * Docs: https://day.js.org/docs/en/manipulate/start-of
       */
      startOf(unit: OpUnitType): Dayjs;
      /**
       * Returns a cloned Day.js object and set it to the end of a unit of time.
       * ```
       * dayjs().endOf('month')// => Dayjs
       * ```
       * Units are case insensitive, and support plural and short forms.
       *
       * Docs: https://day.js.org/docs/en/manipulate/end-of
       */
      endOf(unit: OpUnitType): Dayjs;
      /**
       * Get the formatted date according to the string of tokens passed in.
       *
       * To escape characters, wrap them in square brackets (e.g. [MM]).
       * ```
       * dayjs().format()// => current date in ISO8601, without fraction seconds e.g. '2020-04-02T08:02:17-05:00'
       * dayjs('2019-01-25').format('[YYYYescape] YYYY-MM-DDTHH:mm:ssZ[Z]')// 'YYYYescape 2019-01-25T00:00:00-02:00Z'
       * dayjs('2019-01-25').format('DD/MM/YYYY') // '25/01/2019'
       * ```
       * Docs: https://day.js.org/docs/en/display/format
       */
      format(template?: string): string;
      /**
       * This indicates the difference between two date-time in the specified unit.
       *
       * To get the difference in milliseconds, use `dayjs#diff`
       * ```
       * const date1 = dayjs('2019-01-25')
       * const date2 = dayjs('2018-06-05')
       * date1.diff(date2) // 20214000000 default milliseconds
       * date1.diff() // milliseconds to current time
       * ```
       *
       * To get the difference in another unit of measurement, pass that measurement as the second argument.
       * ```
       * const date1 = dayjs('2019-01-25')
       * date1.diff('2018-06-05', 'month') // 7
       * ```
       * Units are case insensitive, and support plural and short forms.
       *
       * Docs: https://day.js.org/docs/en/display/difference
       */
      diff(date?: ConfigType, unit?: QUnitType | OpUnitType, float?: boolean): number;
      /**
       * This returns the number of **milliseconds** since the Unix Epoch of the Day.js object.
       * ```
       * dayjs('2019-01-25').valueOf() // 1548381600000
       * +dayjs(1548381600000) // 1548381600000
       * ```
       * To get a Unix timestamp (the number of seconds since the epoch) from a Day.js object, you should use Unix Timestamp `dayjs#unix()`.
       *
       * Docs: https://day.js.org/docs/en/display/unix-timestamp-milliseconds
       */
      valueOf(): number;
      /**
       * This returns the Unix timestamp (the number of **seconds** since the Unix Epoch) of the Day.js object.
       * ```
       * dayjs('2019-01-25').unix() // 1548381600
       * ```
       * This value is floored to the nearest second, and does not include a milliseconds component.
       *
       * Docs: https://day.js.org/docs/en/display/unix-timestamp
       */
      unix(): number;
      /**
       * Get the number of days in the current month.
       * ```
       * dayjs('2019-01-25').daysInMonth() // 31
       * ```
       * Docs: https://day.js.org/docs/en/display/days-in-month
       */
      daysInMonth(): number;
      /**
       * To get a copy of the native `Date` object parsed from the Day.js object use `dayjs#toDate`.
       * ```
       * dayjs('2019-01-25').toDate()// => Date
       * ```
       */
      toDate(): Date;
      /**
       * To serialize as an ISO 8601 string.
       * ```
       * dayjs('2019-01-25').toJSON() // '2019-01-25T02:00:00.000Z'
       * ```
       * Docs: https://day.js.org/docs/en/display/as-json
       */
      toJSON(): string;
      /**
       * To format as an ISO 8601 string.
       * ```
       * dayjs('2019-01-25').toISOString() // '2019-01-25T02:00:00.000Z'
       * ```
       * Docs: https://day.js.org/docs/en/display/as-iso-string
       */
      toISOString(): string;
      /**
       * Returns a string representation of the date.
       * ```
       * dayjs('2019-01-25').toString() // 'Fri, 25 Jan 2019 02:00:00 GMT'
       * ```
       * Docs: https://day.js.org/docs/en/display/as-string
       */
      toString(): string;
      /**
       * Get the UTC offset in minutes.
       * ```
       * dayjs().utcOffset()
       * ```
       * Docs: https://day.js.org/docs/en/manipulate/utc-offset
       */
      utcOffset(): number;
      /**
       * This indicates whether the Day.js object is before the other supplied date-time.
       * ```
       * dayjs().isBefore(dayjs('2011-01-01')) // default milliseconds
       * ```
       * If you want to limit the granularity to a unit other than milliseconds, pass it as the second parameter.
       * ```
       * dayjs().isBefore('2011-01-01', 'year')// => boolean
       * ```
       * Units are case insensitive, and support plural and short forms.
       *
       * Docs: https://day.js.org/docs/en/query/is-before
       */
      isBefore(date?: ConfigType, unit?: OpUnitType): boolean;
      /**
       * This indicates whether the Day.js object is the same as the other supplied date-time.
       * ```
       * dayjs().isSame(dayjs('2011-01-01')) // default milliseconds
       * ```
       * If you want to limit the granularity to a unit other than milliseconds, pass it as the second parameter.
       * ```
       * dayjs().isSame('2011-01-01', 'year')// => boolean
       * ```
       * Docs: https://day.js.org/docs/en/query/is-same
       */
      isSame(date?: ConfigType, unit?: OpUnitType): boolean;
      /**
       * This indicates whether the Day.js object is after the other supplied date-time.
       * ```
       * dayjs().isAfter(dayjs('2011-01-01')) // default milliseconds
       * ```
       * If you want to limit the granularity to a unit other than milliseconds, pass it as the second parameter.
       * ```
       * dayjs().isAfter('2011-01-01', 'year')// => boolean
       * ```
       * Units are case insensitive, and support plural and short forms.
       *
       * Docs: https://day.js.org/docs/en/query/is-after
       */
      isAfter(date?: ConfigType, unit?: OpUnitType): boolean;
  
      locale(): string;
  
      locale(preset: string | ILocale, object?: Partial<ILocale>): Dayjs;
    }
  
    export type PluginFunc<T = unknown> = (option: T, c: typeof Dayjs, d: typeof dayjs) => void;
  
    export function extend<T = unknown>(plugin: PluginFunc<T>, option?: T): Dayjs;
  
    export function locale(preset?: string | ILocale, object?: Partial<ILocale>, isLocal?: boolean): string;
  
    export function isDayjs(d: any): d is Dayjs;
  
    export function unix(t: number): Dayjs;
  
    const Ls: { [key: string]: ILocale };
  }

  /// SOURCE FILE: src/types/libraries/axios.ts ///

  export type AxiosHeaderValue = AxiosHeaders | string | string[] | number | boolean | null;
  
  export interface RawAxiosHeaders {
    [key: string]: AxiosHeaderValue;
  }
  
  export type MethodsHeaders = Partial<
    {
      [Key in Method as Lowercase<Key>]: AxiosHeaders;
    } & { common: AxiosHeaders }
  >;
  
  export type AxiosHeaderMatcher = string | RegExp | ((this: AxiosHeaders, value: string, name: string) => boolean);
  
  export type AxiosHeaderParser = (this: AxiosHeaders, value: AxiosHeaderValue, header: string) => any;
  
  export class AxiosHeaders {
    constructor(headers?: RawAxiosHeaders | AxiosHeaders | string);
  
    [key: string]: any;
  
    set(headerName?: string, value?: AxiosHeaderValue, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;
    set(headers?: RawAxiosHeaders | AxiosHeaders | string, rewrite?: boolean): AxiosHeaders;
  
    get(headerName: string, parser: RegExp): RegExpExecArray | null;
    get(headerName: string, matcher?: true | AxiosHeaderParser): AxiosHeaderValue;
  
    has(header: string, matcher?: AxiosHeaderMatcher): boolean;
  
    delete(header: string | string[], matcher?: AxiosHeaderMatcher): boolean;
  
    clear(matcher?: AxiosHeaderMatcher): boolean;
  
    normalize(format: boolean): AxiosHeaders;
  
    concat(...targets: Array<AxiosHeaders | RawAxiosHeaders | string | undefined | null>): AxiosHeaders;
  
    toJSON(asStrings?: boolean): RawAxiosHeaders;
  
    static from(thing?: AxiosHeaders | RawAxiosHeaders | string): AxiosHeaders;
  
    static accessor(header: string | string[]): AxiosHeaders;
  
    static concat(...targets: Array<AxiosHeaders | RawAxiosHeaders | string | undefined | null>): AxiosHeaders;
  
    setContentType(value: ContentType, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;
    getContentType(parser?: RegExp): RegExpExecArray | null;
    getContentType(matcher?: AxiosHeaderMatcher): AxiosHeaderValue;
    hasContentType(matcher?: AxiosHeaderMatcher): boolean;
  
    setContentLength(value: AxiosHeaderValue, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;
    getContentLength(parser?: RegExp): RegExpExecArray | null;
    getContentLength(matcher?: AxiosHeaderMatcher): AxiosHeaderValue;
    hasContentLength(matcher?: AxiosHeaderMatcher): boolean;
  
    setAccept(value: AxiosHeaderValue, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;
    getAccept(parser?: RegExp): RegExpExecArray | null;
    getAccept(matcher?: AxiosHeaderMatcher): AxiosHeaderValue;
    hasAccept(matcher?: AxiosHeaderMatcher): boolean;
  
    setUserAgent(value: AxiosHeaderValue, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;
    getUserAgent(parser?: RegExp): RegExpExecArray | null;
    getUserAgent(matcher?: AxiosHeaderMatcher): AxiosHeaderValue;
    hasUserAgent(matcher?: AxiosHeaderMatcher): boolean;
  
    setContentEncoding(value: AxiosHeaderValue, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;
    getContentEncoding(parser?: RegExp): RegExpExecArray | null;
    getContentEncoding(matcher?: AxiosHeaderMatcher): AxiosHeaderValue;
    hasContentEncoding(matcher?: AxiosHeaderMatcher): boolean;
  
    setAuthorization(value: AxiosHeaderValue, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;
    getAuthorization(parser?: RegExp): RegExpExecArray | null;
    getAuthorization(matcher?: AxiosHeaderMatcher): AxiosHeaderValue;
    hasAuthorization(matcher?: AxiosHeaderMatcher): boolean;
  
    [Symbol.iterator](): IterableIterator<[string, AxiosHeaderValue]>;
  }
  
  export type CommonRequestHeadersList = "Accept" | "Content-Length" | "User-Agent" | "Content-Encoding" | "Authorization";
  
  export type ContentType =
    | AxiosHeaderValue
    | "text/html"
    | "text/plain"
    | "multipart/form-data"
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "application/octet-stream";
  
  export type RawAxiosRequestHeaders = Partial<
    RawAxiosHeaders & {
      [Key in CommonRequestHeadersList]: AxiosHeaderValue;
    } & {
      "Content-Type": ContentType;
    }
  >;
  
  export type AxiosRequestHeaders = RawAxiosRequestHeaders & AxiosHeaders;
  
  export type CommonResponseHeadersList = "Server" | "Content-Type" | "Content-Length" | "Cache-Control" | "Content-Encoding";
  
  export type RawCommonResponseHeaders = {
    [Key in CommonResponseHeadersList]: AxiosHeaderValue;
  } & {
    "set-cookie": string[];
  };
  
  export type RawAxiosResponseHeaders = Partial<RawAxiosHeaders & RawCommonResponseHeaders>;
  
  export type AxiosResponseHeaders = RawAxiosResponseHeaders & AxiosHeaders;
  
  export interface AxiosRequestTransformer {
    (this: InternalAxiosRequestConfig, data: any, headers: AxiosRequestHeaders): any;
  }
  
  export interface AxiosResponseTransformer {
    (this: InternalAxiosRequestConfig, data: any, headers: AxiosResponseHeaders, status?: number): any;
  }
  
  export interface AxiosAdapter {
    (config: InternalAxiosRequestConfig): AxiosPromise;
  }
  
  export interface AxiosBasicCredentials {
    username: string;
    password: string;
  }
  
  export interface AxiosProxyConfig {
    host: string;
    port: number;
    auth?: AxiosBasicCredentials;
    protocol?: string;
  }
  
  export enum HttpStatusCode {
    Continue = 100,
    SwitchingProtocols = 101,
    Processing = 102,
    EarlyHints = 103,
    Ok = 200,
    Created = 201,
    Accepted = 202,
    NonAuthoritativeInformation = 203,
    NoContent = 204,
    ResetContent = 205,
    PartialContent = 206,
    MultiStatus = 207,
    AlreadyReported = 208,
    ImUsed = 226,
    MultipleChoices = 300,
    MovedPermanently = 301,
    Found = 302,
    SeeOther = 303,
    NotModified = 304,
    UseProxy = 305,
    Unused = 306,
    TemporaryRedirect = 307,
    PermanentRedirect = 308,
    BadRequest = 400,
    Unauthorized = 401,
    PaymentRequired = 402,
    Forbidden = 403,
    NotFound = 404,
    MethodNotAllowed = 405,
    NotAcceptable = 406,
    ProxyAuthenticationRequired = 407,
    RequestTimeout = 408,
    Conflict = 409,
    Gone = 410,
    LengthRequired = 411,
    PreconditionFailed = 412,
    PayloadTooLarge = 413,
    UriTooLong = 414,
    UnsupportedMediaType = 415,
    RangeNotSatisfiable = 416,
    ExpectationFailed = 417,
    ImATeapot = 418,
    MisdirectedRequest = 421,
    UnprocessableEntity = 422,
    Locked = 423,
    FailedDependency = 424,
    TooEarly = 425,
    UpgradeRequired = 426,
    PreconditionRequired = 428,
    TooManyRequests = 429,
    RequestHeaderFieldsTooLarge = 431,
    UnavailableForLegalReasons = 451,
    InternalServerError = 500,
    NotImplemented = 501,
    BadGateway = 502,
    ServiceUnavailable = 503,
    GatewayTimeout = 504,
    HttpVersionNotSupported = 505,
    VariantAlsoNegotiates = 506,
    InsufficientStorage = 507,
    LoopDetected = 508,
    NotExtended = 510,
    NetworkAuthenticationRequired = 511,
  }
  
  export type Method =
    | "get"
    | "GET"
    | "delete"
    | "DELETE"
    | "head"
    | "HEAD"
    | "options"
    | "OPTIONS"
    | "post"
    | "POST"
    | "put"
    | "PUT"
    | "patch"
    | "PATCH"
    | "purge"
    | "PURGE"
    | "link"
    | "LINK"
    | "unlink"
    | "UNLINK";
  
  export type ResponseType = "arraybuffer" | "blob" | "document" | "json" | "text" | "stream" | "formdata";
  
  export type responseEncoding =
    | "ascii"
    | "ASCII"
    | "ansi"
    | "ANSI"
    | "binary"
    | "BINARY"
    | "base64"
    | "BASE64"
    | "base64url"
    | "BASE64URL"
    | "hex"
    | "HEX"
    | "latin1"
    | "LATIN1"
    | "ucs-2"
    | "UCS-2"
    | "ucs2"
    | "UCS2"
    | "utf-8"
    | "UTF-8"
    | "utf8"
    | "UTF8"
    | "utf16le"
    | "UTF16LE";
  
  export interface TransitionalOptions {
    silentJSONParsing?: boolean;
    forcedJSONParsing?: boolean;
    clarifyTimeoutError?: boolean;
  }
  
  export interface GenericAbortSignal {
    readonly aborted: boolean;
    onabort?: ((...args: any) => any) | null;
    addEventListener?: (...args: any) => any;
    removeEventListener?: (...args: any) => any;
  }
  
  export interface FormDataVisitorHelpers {
    defaultVisitor: SerializerVisitor;
    convertValue: (value: any) => any;
    isVisitable: (value: any) => boolean;
  }
  
  export interface SerializerVisitor {
    (
      this: GenericFormData,
      value: any,
      key: string | number,
      path: null | Array<string | number>,
      helpers: FormDataVisitorHelpers
    ): boolean;
  }
  
  export interface SerializerOptions {
    visitor?: SerializerVisitor;
    dots?: boolean;
    metaTokens?: boolean;
    indexes?: boolean | null;
  }
  
  // tslint:disable-next-line
  export interface FormSerializerOptions extends SerializerOptions {}
  
  export interface ParamEncoder {
    (value: any, defaultEncoder: (value: any) => any): any;
  }
  
  export interface CustomParamsSerializer {
    (params: Record<string, any>, options?: ParamsSerializerOptions): string;
  }
  
  export interface ParamsSerializerOptions extends SerializerOptions {
    encode?: ParamEncoder;
    serialize?: CustomParamsSerializer;
  }
  
  export type MaxUploadRate = number;
  
  export type MaxDownloadRate = number;
  
  export type BrowserProgressEvent = any;
  
  export interface AxiosProgressEvent {
    loaded: number;
    total?: number;
    progress?: number;
    bytes: number;
    rate?: number;
    estimated?: number;
    upload?: boolean;
    download?: boolean;
    event?: BrowserProgressEvent;
    lengthComputable: boolean;
  }
  
  export type Milliseconds = number;
  
  export type AxiosAdapterName = "fetch" | "xhr" | "http" | string;
  
  export type AxiosAdapterConfig = AxiosAdapter | AxiosAdapterName;
  
  export type AddressFamily = 4 | 6 | undefined;
  
  export interface LookupAddressEntry {
    address: string;
    family?: AddressFamily;
  }
  
  export type LookupAddress = string | LookupAddressEntry;
  
  export interface AxiosRequestConfig<D = any> {
    url?: string;
    method?: Method | string;
    baseURL?: string;
    transformRequest?: AxiosRequestTransformer | AxiosRequestTransformer[];
    transformResponse?: AxiosResponseTransformer | AxiosResponseTransformer[];
    headers?: (RawAxiosRequestHeaders & MethodsHeaders) | AxiosHeaders;
    params?: any;
    paramsSerializer?: ParamsSerializerOptions | CustomParamsSerializer;
    data?: D;
    timeout?: Milliseconds;
    timeoutErrorMessage?: string;
    withCredentials?: boolean;
    adapter?: AxiosAdapterConfig | AxiosAdapterConfig[];
    auth?: AxiosBasicCredentials;
    responseType?: ResponseType;
    responseEncoding?: responseEncoding | string;
    xsrfCookieName?: string;
    xsrfHeaderName?: string;
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
    maxContentLength?: number;
    validateStatus?: ((status: number) => boolean) | null;
    maxBodyLength?: number;
    maxRedirects?: number;
    maxRate?: number | [MaxUploadRate, MaxDownloadRate];
    beforeRedirect?: (
      options: Record<string, any>,
      responseDetails: { headers: Record<string, string>; statusCode: HttpStatusCode }
    ) => void;
    socketPath?: string | null;
    transport?: any;
    httpAgent?: any;
    httpsAgent?: any;
    proxy?: AxiosProxyConfig | false;
    cancelToken?: CancelToken;
    decompress?: boolean;
    transitional?: TransitionalOptions;
    signal?: GenericAbortSignal;
    insecureHTTPParser?: boolean;
    env?: {
      FormData?: new (...args: any[]) => object;
    };
    formSerializer?: FormSerializerOptions;
    family?: AddressFamily;
    lookup?:
      | ((
          hostname: string,
          options: object,
          cb: (err: Error | null, address: LookupAddress | LookupAddress[], family?: AddressFamily) => void
        ) => void)
      | ((
          hostname: string,
          options: object
        ) => Promise<[address: LookupAddressEntry | LookupAddressEntry[], family?: AddressFamily] | LookupAddress>);
    withXSRFToken?: boolean | ((config: InternalAxiosRequestConfig) => boolean | undefined);
    fetchOptions?: Record<string, any>;
  }
  
  // Alias
  export type RawAxiosRequestConfig<D = any> = AxiosRequestConfig<D>;
  
  export interface InternalAxiosRequestConfig<D = any> extends AxiosRequestConfig<D> {
    headers: AxiosRequestHeaders;
  }
  
  export interface HeadersDefaults {
    common: RawAxiosRequestHeaders;
    delete: RawAxiosRequestHeaders;
    get: RawAxiosRequestHeaders;
    head: RawAxiosRequestHeaders;
    post: RawAxiosRequestHeaders;
    put: RawAxiosRequestHeaders;
    patch: RawAxiosRequestHeaders;
    options?: RawAxiosRequestHeaders;
    purge?: RawAxiosRequestHeaders;
    link?: RawAxiosRequestHeaders;
    unlink?: RawAxiosRequestHeaders;
  }
  
  export interface AxiosDefaults<D = any> extends Omit<AxiosRequestConfig<D>, "headers"> {
    headers: HeadersDefaults;
  }
  
  export interface CreateAxiosDefaults<D = any> extends Omit<AxiosRequestConfig<D>, "headers"> {
    headers?: RawAxiosRequestHeaders | AxiosHeaders | Partial<HeadersDefaults>;
  }
  
  export interface AxiosResponse<T = any, D = any> {
    data: T;
    status: number;
    statusText: string;
    headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
    config: InternalAxiosRequestConfig<D>;
    request?: any;
  }
  
  export class AxiosError<T = unknown, D = any> extends Error {
    constructor(
      message?: string,
      code?: string,
      config?: InternalAxiosRequestConfig<D>,
      request?: any,
      response?: AxiosResponse<T, D>
    );
  
    config?: InternalAxiosRequestConfig<D>;
    code?: string;
    request?: any;
    response?: AxiosResponse<T, D>;
    isAxiosError: boolean;
    status?: number;
    toJSON: () => object;
    cause?: Error;
    static from<T = unknown, D = any>(
      error: Error | unknown,
      code?: string,
      config?: InternalAxiosRequestConfig<D>,
      request?: any,
      response?: AxiosResponse<T, D>,
      customProps?: object
    ): AxiosError<T, D>;
    static readonly ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
    static readonly ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
    static readonly ERR_BAD_OPTION = "ERR_BAD_OPTION";
    static readonly ERR_NETWORK = "ERR_NETWORK";
    static readonly ERR_DEPRECATED = "ERR_DEPRECATED";
    static readonly ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
    static readonly ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
    static readonly ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
    static readonly ERR_INVALID_URL = "ERR_INVALID_URL";
    static readonly ERR_CANCELED = "ERR_CANCELED";
    static readonly ECONNABORTED = "ECONNABORTED";
    static readonly ETIMEDOUT = "ETIMEDOUT";
  }
  
  export class CanceledError<T> extends AxiosError<T> {}
  
  export type AxiosPromise<T = any> = Promise<AxiosResponse<T>>;
  
  export interface CancelStatic {
    new (message?: string): Cancel;
  }
  
  export interface Cancel {
    message: string | undefined;
  }
  
  export interface Canceler {
    (message?: string, config?: AxiosRequestConfig, request?: any): void;
  }
  
  export interface CancelTokenStatic {
    new (executor: (cancel: Canceler) => void): CancelToken;
    source(): CancelTokenSource;
  }
  
  export interface CancelToken {
    promise: Promise<Cancel>;
    reason?: Cancel;
    throwIfRequested(): void;
  }
  
  export interface CancelTokenSource {
    token: CancelToken;
    cancel: Canceler;
  }
  
  export interface AxiosInterceptorOptions {
    synchronous?: boolean;
    runWhen?: (config: InternalAxiosRequestConfig) => boolean;
  }
  
  export type AxiosRequestInterceptorUse<T> = (
    onFulfilled?: ((value: T) => T | Promise<T>) | null,
    onRejected?: ((error: any) => any) | null,
    options?: AxiosInterceptorOptions
  ) => number;
  
  export type AxiosResponseInterceptorUse<T> = (
    onFulfilled?: ((value: T) => T | Promise<T>) | null,
    onRejected?: ((error: any) => any) | null
  ) => number;
  
  export interface AxiosInterceptorManager<V> {
    use: V extends AxiosResponse ? AxiosResponseInterceptorUse<V> : AxiosRequestInterceptorUse<V>;
    eject(id: number): void;
    clear(): void;
  }
  
  export class Axios {
    constructor(config?: AxiosRequestConfig);
    defaults: AxiosDefaults;
    interceptors: {
      request: AxiosInterceptorManager<InternalAxiosRequestConfig>;
      response: AxiosInterceptorManager<AxiosResponse>;
    };
    getUri(config?: AxiosRequestConfig): string;
    request<T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
    get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    head<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    options<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    postForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    putForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patchForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  }
  
  export interface AxiosInstance extends Axios {
    <T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
    <T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  
    defaults: Omit<AxiosDefaults, "headers"> & {
      headers: HeadersDefaults & {
        [key: string]: AxiosHeaderValue;
      };
    };
  }
  
  export interface GenericFormData {
    append(name: string, value: any, options?: any): any;
  }
  
  export interface GenericHTMLFormElement {
    name: string;
    method: string;
    submit(): void;
  }
  
  export function getAdapter(adapters: AxiosAdapterConfig | AxiosAdapterConfig[] | undefined): AxiosAdapter;
  
  export function toFormData(
    sourceObj: object,
    targetFormData?: GenericFormData,
    options?: FormSerializerOptions
  ): GenericFormData;
  
  export function formToJSON(form: GenericFormData | GenericHTMLFormElement): object;
  
  export function isAxiosError<T = any, D = any>(payload: any): payload is AxiosError<T, D>;
  
  export function spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
  
  export function isCancel(value: any): value is Cancel;
  
  export function all<T>(values: Array<T | Promise<T>>): Promise<T[]>;
  
  export function mergeConfig<D = any>(
    config1: AxiosRequestConfig<D>,
    config2: AxiosRequestConfig<D>
  ): AxiosRequestConfig<D>;
  
  export interface AxiosStatic extends AxiosInstance {
    create(config?: CreateAxiosDefaults): AxiosInstance;
    Cancel: CancelStatic;
    CancelToken: CancelTokenStatic;
    Axios: typeof Axios;
    AxiosError: typeof AxiosError;
    HttpStatusCode: typeof HttpStatusCode;
    readonly VERSION: string;
    isCancel: typeof isCancel;
    all: typeof all;
    spread: typeof spread;
    isAxiosError: typeof isAxiosError;
    toFormData: typeof toFormData;
    formToJSON: typeof formToJSON;
    getAdapter: typeof getAdapter;
    CanceledError: typeof CanceledError;
    AxiosHeaders: typeof AxiosHeaders;
    mergeConfig: typeof mergeConfig;
  }
  
  export const axios: AxiosStatic;

  /// SOURCE FILE: src/types/external/mongo.ts ///

  export interface UpdateResult {
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedCount: number;
    upsertedId: number;
  }
  
  export interface DeleteResult {
    acknowledged: boolean;
    deletedCount: number;
  }
  
  export type UpdateWriteOpResult = UpdateResult;

  /// SOURCE FILE: src/types/external/legacy.ts ///

  export interface LegacyConnectionInfo {
    url: string;
    authCode?: string;
    username: string;
    password: string;
  }
  
  export interface UserDirectory {
    name: string;
    scopedPath: string;
    files: PartialArcFile[];
    directories: PartialUserDir[];
  }
  
  export interface PartialUserDir {
    name: string;
    scopedPath: string;
  }
  
  export interface PartialArcFile {
    size?: number;
    mime: string;
    filename: string;
    scopedPath: string;
    dateCreated: number;
    dateModified: number;
  }
  
  export interface FSQuota {
    username: string;
    max: number;
    free: number;
    used: number;
  }

  /// SOURCE FILE: src/types/dayjs/locale.ts ///

  export interface ILocale {
    name: string;
    weekdays?: string[];
    months?: string[];
    weekStart?: number;
    weekdaysShort?: string[];
    monthsShort?: string[];
    weekdaysMin?: string[];
    ordinal?: (n: number) => number | string;
    formats: Partial<{
      LT: string;
      LTS: string;
      L: string;
      LL: string;
      LLL: string;
      LLLL: string;
    }>;
    relativeTime: Partial<{
      future: string;
      past: string;
      s: string;
      m: string;
      mm: string;
      h: string;
      hh: string;
      d: string;
      dd: string;
      M: string;
      MM: string;
      y: string;
      yy: string;
    }>;
  }

  /// SOURCE FILE: src/types/daemon/index.ts ///

  export type UserDaemonInitCallback = (daemon: IUserDaemon, broadcast: (m: string) => void) => MaybePromise<void>;
  export type UserDaemonInitStage =
    | "filesystem"
    | "preferencesSync"
    | "notifyLogin"
    | "serviceHost"
    | "firstRun"
    | "driveNotifierWatcher"
    | "indexing"
    | "statusRefresh"
    | "letsGo"
    | "workspaces"
    | "autorun";
  export type UserDaemonInitStagesSelection = Partial<UserDaemonInitStage[]>;
  export type UserDaemonInitCallbacks = Partial<Record<UserDaemonInitStage, UserDaemonInitCallback>>;
  
  export interface UserDaemonStartOptions {
    startStages: UserDaemonInitStagesSelection;
    stageCallbacks: UserDaemonInitCallbacks;
    onUserInfo: (info: UserInfo) => MaybePromise<ICommandResult>;
  }

  /// SOURCE FILE: src/types/apps/app.ts ///

  export interface App {
    metadata: AppMetadata;
    size: Size;
    minSize: Size;
    maxSize: Size;
    position: MaybeCenteredPosition;
    state: AppState;
    controls: WindowControls;
    assets: AppAssets;
    autoRun?: boolean;
    core?: boolean;
    hidden?: boolean;
    overlay?: boolean;
    glass?: boolean;
    thirdParty?: false;
    id: string;
    originId?: string;
    entrypoint?: string;
    workingDirectory?: string;
    opens?: {
      extensions?: string[];
      mimeTypes?: string[];
    };
    elevated?: boolean;
    acceleratorDescriptions?: Record<string, string>; // <[combo in One+Two+Key format], description>
    fileSignatures?: Record<string, string>;
    process?: IThirdPartyAppProcess;
    tpaRevision?: number;
    noSafeMode?: boolean;
    vital?: boolean;
    _internalResolvedPath?: string;
    _internalOriginalPath?: string;
    _internalMinVer?: string;
    _internalSysVer?: string;
    _internalLoadTime?: number;
    loadCondition?: (daemon: IUserDaemon) => MaybePromise<boolean>;
  }
  
  export type RegisteredProcess = {
    metadata: AppMetadata;
    id: string;
    assets: {
      runtime: Constructs<IProcess>;
    };
    vital?: boolean;
    _internalMinVer?: string;
    hidden?: boolean;
    core?: boolean;
  };
  
  export interface InstalledApp extends App {
    metadata: AppMetadata;
    tpaPath: string;
  }
  
  export type ScriptedApp = Omit<App, "assets">;
  
  export interface AppMetadata {
    name: string;
    version: string;
    author: string;
    icon: string;
    appGroup?: string;
  }
  
  export interface AppState {
    resizable: boolean;
    minimized: boolean;
    maximized: boolean;
    fullscreen: boolean;
    headless: boolean;
  }
  
  export interface WindowControls {
    minimize: boolean;
    maximize: boolean;
    close: boolean;
  }
  
  export interface AppAssets {
    runtime: Constructs<IProcess>;
    component?: typeof SvelteComponent;
  }
  
  export interface AppComponentProps<T = IAppProcess> {
    process: T;
    pid: number;
    app: App;
    windowTitle: ReadableStore<string>;
    windowIcon: ReadableStore<string>;
  }
  
  export type Size = { w: number; h: number };
  export type Position = { x: number; y: number };
  export type MaybeCenteredPosition = Partial<Position> & { centered?: boolean };
  
  export type AppProcessData = { data: App; id: string; desktop?: string };
  
  export type AppStorage = (InstalledApp & { originId?: string })[];
  export type AppStoreCb = () => MaybePromise<AppStorage>;
  
  export interface ContextMenuItem {
    sep?: boolean;
    caption?: string;
    icon?: string;
    image?: string; // icon ID !!!
    isActive?: ContextMenuCallback<boolean>;
    action?: ContextMenuCallback;
    subItems?: ContextMenuItem[];
    disabled?: ContextMenuCallback<boolean>;
    accelerator?: string;
  }
  
  export type ContextMenuCallback<T = any> = (...args: any[]) => MaybePromise<T>;
  
  export type AppContextMenu = { [key: string]: ContextMenuItem[] };
  export interface ContextMenuInstance {
    x: number;
    y: number;
    items: ContextMenuItem[];
    process?: IAppProcess;
    artificial?: boolean;
    props?: any[];
  }
  
  export interface WindowResizer {
    className: string;
    cursor: string;
    width: string;
    height: string;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  }
  
  export interface ToastMessage {
    content: string;
    icon?: string;
  }
  
  export interface AppProcessSpawnOptions {
    asOverlay?: boolean;
    noWorkspace?: boolean;
    renderTarget?: HTMLDivElement;
  }
  
  export interface TpaSpawnEntrypointResult<T = any> {
    runtime?: Constructs<IProcess>;
    returnValue?: T;
  }
  

  /// SOURCE FILE: src/types/apps/accelerator.ts ///

  export interface AppKeyCombination {
    alt?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    key?: string;
    action(proc: any, event: KeyboardEvent): void;
    global?: boolean;
  }
  
  export type AppKeyCombinations = AppKeyCombination[];

  /// SOURCE FILE: src/interfaces/services/ITrayHostService.ts ///

  export interface ITrayHostService extends IBaseService {
    trayIcons: ReadableStore<Record<`${number}#${string}`, ITrayIconProcess>>;
    loading: BooleanStore;
    createTrayIcon(pid: number, identifier: string, options: TrayIconOptions, process?: Constructs<IProcess>): Promise<boolean>;
    disposeTrayIcon(pid: number, identifier: string): Promise<false | undefined>;
    disposeProcessTrayIcons(pid: number): void;
    disposeAllTrayIcons(): Promise<void>;
    changeIcon(pid: number, identifier: string, newIcon: string): void;
  }
  
  export interface ITrayIconProcess extends IProcess {
    targetPid: number;
    identifier: string;
    popup?: TrayPopup;
    context?: ContextMenuItem[];
    action?: (targetedProcess: IProcess) => void;
    componentMount: Record<string, any>;
    icon: string;
    shell: IShellRuntime;
    __render(): Promise<void>;
    stop(): Promise<void>;
    renderPopup(popup: HTMLDivElement, target: IProcess): Promise<void>;
    getPopupBody(): Element | null;
  }

  /// SOURCE FILE: src/interfaces/services/ITrashCanService.ts ///

  export interface ITrashCanService extends IBaseService {
    INDEX_PATH: string;
    IndexBuffer: ReadableStore<Record<string, TrashIndexNode>>;
    Configuration: IConfigurator<Record<string, TrashIndexNode>>;
    start(): Promise<void>;
    moveToTrash(path: string, dispatch?: boolean): Promise<TrashIndexNode | undefined>;
    restoreTrashItem(uuid: string): Promise<boolean>;
    getIndex(): Record<string, TrashIndexNode>;
    permanentlyDelete(uuid: string): Promise<boolean>;
    emptyBin(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/services/IShareManager.ts ///

  export interface IShareManager extends IBaseService {
    getOwnedShares(): Promise<SharedDriveType[]>;
    mountOwnedShares(): Promise<void>;
    getJoinedShares(): Promise<SharedDriveType[]>;
    createShare(name: string, password: string): Promise<SharedDriveType | undefined>;
    deleteShare(shareId: string): Promise<boolean>;
    changeSharePassword(shareId: string, newPassword: string): Promise<boolean>;
    renameShare(shareId: string, newName: string): Promise<boolean>;
    joinShare(
      username: string,
      shareName: string,
      password: string,
      mountAlso?: boolean
    ): Promise<boolean | IFilesystemDrive | undefined>;
    leaveShare(shareId: string): Promise<boolean>;
    unmountIfMounted(shareId: string): Promise<void>;
    kickUserFromShare(shareId: string, userId: string): Promise<boolean>;
    mountShare(
      username: string,
      shareName: string,
      letter?: string,
      onProgress?: FilesystemProgressCallback
    ): Promise<false | IFilesystemDrive | undefined>;
    mountShareById(shareId: string, letter?: string, onProgress?: FilesystemProgressCallback): Promise<false | IFilesystemDrive>;
    getShareMembers(shareId: string): Promise<Record<string, string>>;
    getShareInfoByName(username: string, shareName: string): Promise<SharedDriveType | undefined>;
    getShareInfoById(shareId: string): Promise<SharedDriveType | undefined>;
  }

  /// SOURCE FILE: src/interfaces/services/IRecentFilesService.ts ///

  export interface IRecentFilesService extends IBaseService {
    Recents: ReadableStore<string[]>;
    readonly CONFIG_PATH: string;
    addToRecents(path: string): boolean;
    removeFromRecents(path: string): boolean;
    getRecents(): string[];
  }

  /// SOURCE FILE: src/interfaces/services/IProtocolServiceProcess.ts ///

  export interface IProtocolServiceProcess extends IBaseService {
    lockObserver: boolean;
    observer?: MutationObserver;
    store: Record<string, ProtocolHandler>;
    start(): Promise<void>;
    parseProtoParam(): void;
    processMutations(mutations: MutationRecord[]): void;
    parseAnchor(anchor: HTMLAnchorElement): void;
    parseUrl(str: string): ArcProtocol | undefined;
    executeUrl(url: string): Promise<boolean | undefined>;
    registerHandler(command: string, handler: ProtocolHandler): boolean;
    unregisterHandler(command: string): boolean;
  }

  /// SOURCE FILE: src/interfaces/services/IMigrationService.ts ///

  export interface IMigrationService extends IBaseService {
    get Config(): Record<string, number>;
    MIGRATIONS: IMigrationNodeConstructor[];
    runMigrations(cb?: MigrationStatusCallback): Promise<Record<string, MigrationResult>>;
    runMigration(migration: IMigrationNodeConstructor, cb?: MigrationStatusCallback): Promise<MigrationResult>;
  }

  /// SOURCE FILE: src/interfaces/services/IMessagingInterface.ts ///

  export interface IMessagingInterface extends IBaseService {
    get serverUrl(): string | undefined;
    start(): Promise<void>;
    getSentMessages(): Promise<ExpandedMessage[]>;
    getReceivedMessages(): Promise<ExpandedMessage[]>;
    getInboxListing(): Promise<ExpandedMessage[]>;
    sendMessage(
      subject: string,
      recipients: string[],
      body: string,
      attachments: File[],
      repliesTo?: string,
      onProgress?: FilesystemProgressCallback
    ): Promise<ICommandResult<Message[]>>;
    deleteMessage(messageId: string): Promise<boolean>;
    readMessage(messageId: string): Promise<ExpandedMessage | undefined>;
    readAttachment(
      messageId: string,
      attachmentId: string,
      onProgress?: FilesystemProgressCallback
    ): Promise<ArrayBuffer | undefined>;
    getMessageThread(messageId?: string): Promise<ExpandedMessageNode[]>;
    buildAttachment(filePath: string, onProgress?: FilesystemProgressCallback): Promise<File | undefined>;
    downloadAttachments(message: ExpandedMessage, attachments: MessageAttachment[], savePath: string): void;
    checkForMissedMessages(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/services/ILibraryManagement.ts ///

  export interface ILibraryManagement extends IBaseService {
    Index: Map<string, TpaLibrary>;
    start(): Promise<void>;
    populateIndex(): Promise<void>;
    deleteLibrary(id: string, onStage?: (stage: string) => void): Promise<boolean>;
    getLibrary<T = any>(id: string): Promise<T>;
  }

  /// SOURCE FILE: src/interfaces/services/IIconService.ts ///

  export interface IIconService extends IBaseService {
    PATH: string;
    FILE_CACHE: Record<string, string>;
    ICON_TYPES: string[];
    DEFAULT_ICON: string;
    Icons: ReadableStore<Record<string, string>>;
    start(): Promise<void>;
    defaultConfiguration(): Record<string, string>;
    getIcon(id: string, noCache?: boolean): Promise<string>;
    getIconCached(id: string): string;
    parseIcon(id: string): ["fs" | "builtin" | "app", string];
    cacheEverything(): Promise<void>;
    getAppIcon(app: App, workingDirectory?: string): string;
    getGroupedIcons(): Record<string, Record<string, string>>;
  }

  /// SOURCE FILE: src/interfaces/services/IGlobalDispatch.ts ///

  export interface IGlobalDispatch extends IBaseService {
    client: Socket | undefined;
    server: IServerManager;
    authorized: boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    connected(): Promise<void>;
    sendUpdate(): void;
    subscribe<T extends Array<any> = any[]>(event: string, callback: (...data: T) => void): void;
    emit(event: string, ...data: any[]): void;
    getClients(): Promise<GlobalDispatchClient[]>;
    disconnectClient(clientId: string): Promise<boolean>;
    enableListener(): void;
  }

  /// SOURCE FILE: src/interfaces/services/IFileAssocService.ts ///

  export interface IFileAssocService extends IBaseService {
    start(): Promise<void>;
    updateConfiguration(
      callback: (config: FileAssociationConfig) => FileAssociationConfig | Promise<FileAssociationConfig>
    ): Promise<void>;
    defaultFileAssociations(): FileAssociationConfig;
    getFileAssociation(path: string): ExpandedFileAssociationInfo | undefined;
    getUnresolvedAssociationIcon(path: string): string;
    getConfiguration(): FileAssociationConfig;
  }

  /// SOURCE FILE: src/interfaces/services/IDistributionServiceProcess.ts ///

  export interface IDistributionServiceProcess extends IBaseService {
    _BUSY: string;
    preferences: UserPreferencesStore;
    start(): Promise<false | undefined>;
    checkBusy(action?: string): string;
    get BUSY(): string;
    set BUSY(value: string);
    addStoreItemToInstalled(item: StoreItem): Promise<boolean | undefined>;
    removeStoreItemFromInstalled(id: string): Promise<boolean | undefined>;
    removeStoreItemFromInstalledByAppId(id: string): Promise<boolean | undefined>;
    loadInstalledStoreItemList(noCache?: boolean): Promise<StoreItem[]>;
    writeInstalledStoreItemList(list: StoreItem[]): Promise<boolean>;
    getInstalledStoreItemById(id: string): Promise<StoreItem | undefined>;
    addPackageToInstalled(item: ArcPackage, force?: boolean): Promise<boolean | undefined>;
    removePackageFromInstalled(id: string): Promise<boolean | undefined>;
    loadInstalledPackageList(): Promise<ArcPackage[]>;
    writeInstalledPackageList(list: ArcPackage[]): Promise<boolean>;
    getInstalledPackageByAppId(id: string): Promise<ArcPackage | undefined>;
    getInstalledStoreItemByAppId(id: string): Promise<StoreItem | undefined>;
    uninstallPackage(appId: string, deleteFiles?: boolean, onStage?: (stage: string) => void): Promise<boolean>;
    packageInstallerFromPath<T = IInstallerProcessBase>(
      path: string,
      progress?: FilesystemProgressCallback,
      item?: StoreItem,
      isUpdate?: boolean
    ): Promise<T | undefined>;
    getInstallerProcess(metadata: ArcPackage): Constructs<IInstallerProcessBase>;
    packageInstaller<T = IInstallerProcessBase>(
      zip: JSZip,
      metadata: ArcPackage,
      item?: StoreItem,
      isUpdate?: boolean
    ): Promise<T | undefined>;
    validatePackage(path: string, progress?: FilesystemProgressCallback): Promise<boolean>;
    getAllStoreItems(): Promise<StoreItem[]>;
    getStoreItemsByAuthor(userId: string): Promise<StoreItem[]>;
    storeItemReadme(id: string): Promise<string>;
    checkForStoreItemUpdate(id: string, installedList?: StoreItem[], allPackages?: StoreItem[]): Promise<UpdateInfo | false>;
    checkForAllStoreItemUpdates(list?: StoreItem[]): Promise<UpdateInfo[]>;
    updateStoreItem<T = IInstallerProcessBase>(
      id: string,
      force?: boolean,
      progress?: FilesystemProgressCallback
    ): Promise<T | false>;
    searchStoreItems(query: string): Promise<PartialStoreItem[]>;
    getInstalledStoreItem(id: string, installedList?: StoreItem[], noCache?: boolean): Promise<StoreItem>;
    getStoreItem(id: string): Promise<StoreItem | undefined>;
    getStoreItemByName(name: string): Promise<StoreItem | undefined>;
    downloadStoreItem(id: string, onProgress?: FilesystemProgressCallback): Promise<ArrayBuffer | undefined>;
    storeItemInstaller(
      id: string,
      onProgress?: FilesystemProgressCallback,
      isUpdate?: boolean
    ): Promise<false | IInstallerProcessBase | undefined>;
    publishing_publishPackage(data: Blob, onProgress?: FilesystemProgressCallback): Promise<boolean>;
    publishing_publishPackageFromPath(path: string, onProgress?: FilesystemProgressCallback): Promise<boolean>;
    publishing_getPublishedPackages(): Promise<StoreItem[]>;
    publishing_deprecateStoreItem(id: string): Promise<boolean>;
    publishing_deleteStoreItem(id: string): Promise<boolean>;
    publishing_updateStoreItem(itemId: string, newData: Blob, onProgress?: FilesystemProgressCallback): Promise<boolean>;
    publishing_updateStoreItemFromPath(
      itemId: string,
      updatePath: string,
      onProgress?: FilesystemProgressCallback
    ): Promise<ICommandResult<UpdateWriteOpResult>>;
  }

  /// SOURCE FILE: src/interfaces/services/IDevelopmentEnvironment.ts ///

  export interface IDevelopmentEnvironment extends IBaseService {
    connected: boolean;
    meta?: ProjectMetadata;
    connect(port: number): Promise<DevEnvActivationResult>;
    disconnect(): Promise<undefined>;
    getProjectMeta(): Promise<ProjectMetadata | undefined>;
    mountDevDrive(): Promise<boolean | undefined>;
    restartTpa(): Promise<undefined>;
    killTpa(): Promise<undefined>;
    refreshCSS(filename: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/services/IBugHuntUserSpaceProcess.ts ///

  export interface IBugHuntUserSpaceProcess extends IBaseService {
    INVALIDATION_THRESHOLD: number;
    privateCache: BugReport[];
    publicCache: BugReport[];
    cachedPrivateResponseCount: number;
    cachedPublicResponseCount: number;
    module: IBugHunt;
    afterActivate(): Promise<void>;
    sendBugReport(options: ReportOptions): Promise<boolean>;
    getPrivateReports(forceInvalidate?: boolean): Promise<BugReport[]>;
    getPublicReports(forceInvalidate?: boolean): Promise<BugReport[]>;
    refreshPrivateCache(): Promise<void>;
    refreshPublicCache(): Promise<void>;
    refreshAllCaches(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/services/IArcFindService.ts ///

  export interface IArcFindService extends IBaseService {
    loading: ReadableStore<boolean>;
    searchQuery: ReadableStore<string>;
    searchResults: ReadableStore<FuseResult<SearchItem>[]>;
    searching: ReadableStore<boolean>;
    SelectionIndex: ReadableStore<number>;
  
    refresh(): Promise<SearchItem[] | undefined>;
    getFilesystemSearchSupplier(preferences: UserPreferences): Promise<SearchItem[]>;
    getAppSearchSupplier(preferences: UserPreferences): Promise<SearchItem[]>;
    getFlatTree(): Promise<PathedFileEntry[]>;
    Search(query: string): Promise<
      {
        id: string;
        item: SearchItem;
        refIndex: number;
        score?: number;
        matches?: ReadonlyArray<FuseResultMatch>;
      }[]
    >;
    MutateIndex(e: KeyboardEvent): void | -1;
    Trigger(result: SearchItem): Promise<void>;
    Submit(): void;
  }

  /// SOURCE FILE: src/interfaces/services/IApplicationStorage.ts ///

  export interface IApplicationStorage extends IBaseService {
    buffer: ReadableStore<AppStorage>;
    appIconCache: Record<string, string>;
    loadOrigin(id: string, store: AppStoreCb): boolean;
    unloadOrigin(id: string): boolean;
    loadApp(app: App): false | App;
    loadAppModuleFile(path: string, noVerify?: boolean): Promise<ICommandResult<App>>;
    injected(): App[];
    refresh(): Promise<void>;
    get(): Promise<AppStorage>;
    getAppSynchronous(id: string): InstalledApp | undefined;
    getAppById(id: string, fromBuffer?: boolean): Promise<ICommandResult<App>>;
    error_appLoadError(result: ICommandResult<App>): Promise<void>;
    loadAppsFromViteModules(modules: Record<string, () => Promise<unknown>>): Promise<AppStorage>;
    loadAppFromViteModule(fn: () => Promise<unknown>, path?: string): Promise<ICommandResult<App>>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IWriterRuntime.ts ///

  export interface IWriterRuntime extends IAppProcess {
    buffer: ReadableStore<string>;
    openedFile: ReadableStore<string>;
    filename: ReadableStore<string>;
    mimetype: ReadableStore<string>;
    directoryName: ReadableStore<string>;
    original: ReadableStore<string>;
    input: ReadableStore<HTMLTextAreaElement>;
    drive: ReadableStore<IFilesystemDrive | undefined>;
    mimeIcon: ReadableStore<string>;
    render({ path }: { path: string }): Promise<void>;
    onClose(): Promise<boolean>;
    readFile(path: string): Promise<void>;
    saveChanges(force?: boolean): Promise<void>;
    saveAs(): Promise<void>;
    openFile(): Promise<void>;
    selectAll(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IWriterReplaceRuntime.ts ///

  export interface IWriterReplaceRuntime extends IAppProcess {
    parent: IWriterRuntime;
  
    replaceOnce(text: string, replacer: string): void;
    replaceAll(text: string, replacer: string): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IWallpaperRuntime.ts ///

  export interface IWallpaperRuntime extends IAppProcess {
    CONFIG_PATH: string;
    contents: ReadableStore<DirectoryReadReturn | undefined>;
    selected: StringStore;
    shortcuts: ReadableStore<ShortcutStore>;
    iconsElement: ReadableStore<HTMLDivElement>;
    orphaned: ReadableStore<string[]>;
    loading: BooleanStore;
    directory: string;
    Positions: ReadableStore<DesktopIcons>;
    Configuration: IConfigurator<DesktopIcons>;
  
    updateContents(): Promise<void>;
    findAndDeleteOrphans(contents: DirectoryReadReturn | undefined): void;
    findFreeDesktopIconPosition(identifier: string, wrapper?: HTMLDivElement): void;
    deleteItem(path: string): Promise<boolean>;
    uploadItems(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ITotpSetupGuiRuntime.ts ///

  export interface ITotpSetupGuiRuntime extends IAppProcess {
    code: ReadableStore<string>;
    url: ReadableStore<string>;
  
    validate(): boolean;
    activateTotp(): Promise<boolean>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ITotpAuthGuiRuntime.ts ///

  export interface ITotpAuthGuiRuntime extends IAppProcess {
    validate(code: string): boolean;
    verifyTotp(code: string): Promise<boolean>;
    cantAccess(): void;
    doDispatch(): Promise<void>;
    cancel(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ISwitchServerRuntime.ts ///

  export interface ISwitchServerRuntime extends IAppProcess {
    servers: ReadableStore<ServerOption[]>;
    selected: ReadableStore<string>;
    loading: ReadableStore<boolean>;
    connectionError: ReadableStore<boolean>;
    subscriber?: number;
  
    start(): Promise<void>;
    stop(): Promise<void>;
    switchServer(server: ServerOption): Promise<void>;
    removeServer(server: ServerOption): Promise<void>;
    addServer(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ISqeletonRuntime.ts ///

  export interface ISqeletonRuntime extends IAppProcess {
    openedFile: ReadableStore<string>;
    openedFileName: ReadableStore<string>;
    _intf: ReadableStore<ISqlInterfaceProcess | undefined>;
    queries: ReadableStore<string[]>;
    queryIndex: ReadableStore<number>;
    errors: ReadableStore<SqeletonError[]>;
    queryHistory: ReadableStore<SqeletonHistoryItem[]>;
    working: ReadableStore<boolean>;
    errored: ReadableStore<boolean>;
    result: ReadableStore<Record<string, any>[][] | undefined>;
    tables: ReadableStore<SqlTable[]>;
    busy: boolean;
    currentTab: ReadableStore<string>;
    syntaxError: ReadableStore<boolean>;
    tempDbPath: string;
    tempDb?: ISqlInterfaceProcess;
    tabs: SqeletonTabs;
    get Interface(): ISqlInterfaceProcess | undefined;
    set Interface(value: ISqlInterfaceProcess | undefined);
  
    start(): Promise<void>;
    stop(): Promise<void>;
    render({ path }: { path?: string }): Promise<void>;
    readFile(path: string): Promise<void>;
    openFile(): Promise<void>;
    newFile(): Promise<void>;
    execute(code: string, simple?: boolean, system?: boolean): Promise<string | Record<string, any>[][] | undefined>;
    updateTables(): Promise<void>;
    newQuery(value?: string): void;
    openOrCreateQuery(value: string): void;
    deleteQuery(index?: number): void;
    tableToSql(table: SqlTable, pretty?: boolean, dropFirst?: boolean): Promise<ICommandResult<string>>;
    hasSyntaxError(input: string): Promise<boolean>;
    waitForAvailable(): Promise<void>;
    dropTableInteractively(table: string): void;
    ExistingConnectionError(): void;
    DbOpenError(e: string): void;
    TablesUpdateError(e: string): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IShortcutPropertiesRuntime.ts ///

  export interface IShortcutPropertiesRuntime extends IAppProcess {
    shortcutData: ReadableStore<ArcShortcut>;
    iconStore: Record<string, string>;
    path?: string;
  
    start(): Promise<false | undefined>;
    save(): Promise<void>;
    goTarget(): Promise<void>;
    changeIcon(): Promise<void>;
    pickTarget(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IShellRuntime.ts ///

  export interface IShellRuntime extends IAppProcess {
    startMenuOpened: ReadableStore<boolean>;
    actionCenterOpened: ReadableStore<boolean>;
    workspaceManagerOpened: ReadableStore<boolean>;
    calendarOpened: ReadableStore<boolean>;
    stackBusy: ReadableStore<boolean>;
    FullscreenCount: ReadableStore<Record<string, Set<number>>>;
    openedTrayPopup: ReadableStore<string>;
    trayHost?: ITrayHostService;
    arcFind?: IArcFindService;
    STARTMENU_FOLDER: string;
    StartMenuContents: ReadableStore<RecursiveDirectoryReadReturn>;
    contextMenu: AppContextMenu;
    selectedAppGroup: ReadableStore<string>;
    start(): Promise<false | undefined>;
    render(): Promise<void>;
    stop(): Promise<boolean>;
    pinApp(appId: string): Promise<void>;
    unpinApp(appId: string): void;
    deleteWorkspace(workspace: Workspace): Promise<void>;
    refreshStartMenu(): Promise<void>;
    exit(): Promise<void>;
    updateFullscreenCount(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IShareMgmtGuiRuntime.ts ///

  export interface IShareMgmtGuiRuntime extends IAppProcess {
    members: ReadableStore<Record<string, string>>;
    info?: SharedDriveType;
    shares: IShareManager;
    shareId: string;
    selectedMember: StringStore;
    myShare: boolean;
  
    updateMembers(): Promise<void>;
    kickUser(id: string, username: string): Promise<void>;
    deleteShare(): Promise<void>;
  }
  
  export interface IShareMgmtOverlayRuntime extends IAppProcess {
    parentProcess: IShareMgmtGuiRuntime;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IShareListGuiRuntime.ts ///

  export interface IShareListGuiRuntime extends IAppProcess {
    ownedShares: ReadableStore<SharedDriveType[]>;
    joinedShares: ReadableStore<SharedDriveType[]>;
    selectedShare: ReadableStore<string>;
    selectedIsOwn: ReadableStore<boolean>;
    selectedIsMounted: ReadableStore<boolean>;
    loading: ReadableStore<boolean>;
    shares: IShareManager;
    thisUserId: string;
  
    start(): Promise<void>;
    manageShare(): Promise<void>;
    leaveShare(): Promise<void>;
    mountShare(): Promise<void>;
    openShare(): Promise<void>;
    createShare(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IShareCreateGuiRuntime.ts ///

  export interface IShareCreateGuiRuntime extends IAppProcess {
    shareName: ReadableStore<string>;
    sharePassword: ReadableStore<string>;
    shares: IShareManager;
  
    go(): Promise<void>;
    myShares(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IShareConnGuiRuntime.ts ///

  export interface IShareConnGuiRuntime extends IAppProcess {
    shareUsername: ReadableStore<string>;
    shareName: ReadableStore<string>;
    sharePassword: ReadableStore<string>;
    shares: IShareManager;
  
    go(): Promise<void>;
    myShares(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ISettingsRuntime.ts ///

  export interface ISettingsRuntime extends IAppProcess {
    currentPage: ReadableStore<string>;
    currentSlide: ReadableStore<string>;
    slideVisible: ReadableStore<boolean>;
    requestedSlide: string | undefined;
    render(): Promise<false | undefined>;
    switchPage(pageId: string): void;
    showSlide(id: string): Promise<void>;
    loginActivity(): Promise<void>;
    logOutEverywhere(): Promise<void>;
    uploadWallpaper(): Promise<void>;
    viewLicense(): Promise<void>;
    deleteThemeConfirmation(id?: string): void;
    chooseProfilePicture(): Promise<void>;
    chooseWallpaper(): Promise<void>;
    chooseLoginBackground(): Promise<void>;
    setup2fa(): Promise<void>;
    disableTotp(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ISettingsOverlayRuntime.ts ///

  export interface ISettingsOverlayRuntime extends IAppProcess {
    parentProcess: ISettingsRuntime;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IServiceInfoRuntime.ts ///

  export interface IServiceInfoRuntime extends IAppProcess {
    serviceId: string;
    service: ReadableStore<Service | undefined>;
    serviceProcess: ReadableStore<IBaseService | undefined>;
    serviceSubscriber?: Unsubscriber;
    start(): Promise<false | undefined>;
    stop(): Promise<void>;
    toggleRunningState(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ISecureContextRuntime.ts ///

  export interface ISecureContextRuntime extends IAppProcess {
    data: ElevationData;
    password: ReadableStore<string>;
    loading: ReadableStore<boolean>;
    
    start(): Promise<false | undefined>;
    render(): Promise<void>;
    validate(): Promise<boolean | undefined>;
    approve(): Promise<void>;
    deny(): Promise<void>;
    passwordIncorrect(): Promise<void>;
    settings(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IRenameItemRuntime.ts ///

  export interface IRenameItemRuntime extends IAppProcess {
    newName: StringStore;
    parentDir: string;
    path: string;
  
    rename(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IQlorbRuntime.ts ///

  export interface IQlorbRuntime extends IAppProcess {
    readonly random: (m: number) => number;
    readonly Boxes: ReadableStore<Box[]>;
    readonly BoxesOffset: ReadableStore<number>;
    readonly Clicks: ReadableStore<number>;
    readonly Score: ReadableStore<number>;
    readonly OldClicks: ReadableStore<number>;
    readonly BOX_SIZE: number;
    readonly BOX_VALUES: number[];
    readonly PAGES: string[];
    readonly CurrentPage: ReadableStore<string>;
  
    render(): Promise<void>;
    spawnBox(props?: Box | null, useOffset?: boolean, forcePositive?: boolean): Box;
    ScorePoints(box: Box, button?: HTMLButtonElement): void;
    ScoreNegativePoints(box: Box, button?: HTMLButtonElement): void;
    clickReset(): void;
    flushStores(): void;
    onSwitchPage(): void;
    switchPage(page: string): boolean;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IProcessManagerRuntime.ts ///

  export interface IProcessManagerRuntime extends IAppProcess {
    selected: ReadableStore<string>;
    running: ReadableStore<number>;
    currentTab: ReadableStore<string>;
    tabs: Record<string, Component>;
    host: IServiceHost;
  
    render(): Promise<false | undefined>;
    kill(proc: IProcess): Promise<void>;
    killError(name: string, result: ProcessKillResult): void;
    stopService(id: string): Promise<void>;
    restartService(id: string): Promise<void>;
    startService(id: string): Promise<void>;
    serviceInfoFor(id: string): void;
    appInfoFor(proc: IAppProcess): void;
    processInfoFor(proc: IProcess): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IProcessInfoRuntime.ts ///

  export interface IProcessInfoRuntime extends IAppProcess {
    parent?: IProcess;
    proc?: IProcess;
    procConstructor?: Constructs<IProcess>;
  
    kill(proc: IProcess): Promise<void>;
    killError(name: string, result: ProcessKillResult): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IPdfViewerRuntime.ts ///

  export interface IPdfViewerRuntime extends IAppProcess {
    openedFile: ReadableStore<string>;
    documentUrl: ReadableStore<string>;
  
    readFile(path: string): Promise<void>;
    readFileIndirectFallback(path: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IOpenWithRuntime.ts ///

  export interface IOpenWithRuntime extends IAppProcess {
    available: ReadableStore<FileOpenerResult[]>;
    all: ReadableStore<FileOpenerResult[]>;
    apps: ReadableStore<FileOpenerResult[]>;
    filename: ReadableStore<string>;
    path: ReadableStore<string>;
    selectedId: ReadableStore<string>;
    viewMode: ReadableStore<"apps" | "all" | "compatible">;
  
    go(id?: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IOopsStackTracerRuntime.ts ///

  export interface IOopsStackTracerRuntime extends IAppProcess {
    data: App;
    proc?: IAppProcess;
    exception: Error | PromiseRejectionEvent;
    stackFrames: ParsedStackFrame[];
    trace: string;
    string: string;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IOopsNotifierRuntime.ts ///

  export interface IOopsNotifierRuntime extends IAppProcess {
    data: App;
    exception: Error | PromiseRejectionEvent;
    process?: IAppProcess;
    installed: boolean;
    parseFailed: boolean;
    stackFrames: ParsedStackFrame[];
  
    details(): Promise<void>;
    reopen(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/INewFolderRuntime.ts ///

  export interface INewFolderRuntime extends IAppProcess {
    newFolder: StringStore;
    path: string;
  
    createFolder(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/INewFileRuntime.ts ///

  export interface INewFileRuntime extends IAppProcess {
    newFile: StringStore;
    path: string;
  
    createFile(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IMultiUpdateGuiRuntime.ts ///

  export interface IMultiUpdateGuiRuntime extends IAppProcess {
    status: ReadableStore<MultiUpdateStatus>;
    currentPackage: ReadableStore<StoreItem | undefined>;
    working: ReadableStore<boolean>;
    done: ReadableStore<boolean>;
    errored: ReadableStore<string[]>;
    logs: ReadableStore<Record<string, InstallStatus>>;
    focused: ReadableStore<string>;
    showLog: ReadableStore<boolean>;
    unified: ReadableStore<boolean>;
    start(): Promise<false | undefined>;
    render(): Promise<void>;
    onClose(): Promise<boolean>;
    updatePackageStatus(appId: string, newData: Partial<MultiUpdateStatusNode>): void;
    packageFailed(appId: string): void;
    go(): Promise<void>;
    checkForErrors(): void;
    mainAction(): void;
    toggleLog(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IMessagingAppRuntime.ts ///

  export interface IMessagingAppRuntime extends IAppProcess {
    service: IMessagingInterface;
    page: ReadableStore<MessagingPage | undefined>;
    pageId: ReadableStore<string | undefined>;
    buffer: ReadableStore<ExpandedMessage[]>;
    correlated: ReadableStore<ExpandedMessage[][]>;
    loading: ReadableStore<boolean>;
    refreshing: ReadableStore<boolean>;
    errored: ReadableStore<boolean>;
    messageNotFound: ReadableStore<boolean>;
    message: ReadableStore<ExpandedMessage | undefined>;
    userInfoCache: Record<string, PublicUserInfo>;
    searchQuery: ReadableStore<string>;
    searchResults: ReadableStore<string[]>;
    messageWindow: boolean;
    messageFromFile: boolean;
    readonly THREAD_DEPTH_MAX: number;
  
    getInbox(): Promise<ExpandedMessage[]>;
    getSent(): Promise<ExpandedMessage[]>;
    getArchived(): Promise<ExpandedMessage[]>;
    readMessage(messageId: string, force?: boolean): Promise<void>;
    userInfo(userId: string): Promise<ICommandResult<PublicUserInfo>>;
    readMessageFromFile(path: string): Promise<boolean | void>;
    deleteMessage(id: string): Promise<void>;
    compose(): void;
    replyTo(message: ExpandedMessage): void;
    forward(message: ExpandedMessage): Promise<void>;
    saveMessage(): Promise<void>;
    getArchiveState(): string[];
    setArchiveState(state: string[]): void;
    isArchived(id: string): boolean;
    addToArchive(id: string): void;
    removeFromArchive(id: string): void;
    toggleArchived(message: ExpandedMessage): void;
    switchPage(id: string): Promise<void>;
    refresh(): Promise<void>;
    correlateMessages(messages: ExpandedMessage[]): ExpandedMessage[][];
    refreshFailed(): void;
    Search(query: string): void;
    popoutMessage(messageId: string): void;
    readAttachment(attachment: MessageAttachment, messageId: string, prog: FileProgressMutator): Promise<ArrayBuffer | undefined>;
    openAttachment(attachment: MessageAttachment, messageId: string): Promise<void>;
    downloadAttachments(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IMessageComposerRuntime.ts ///

  export interface IMessageComposerRuntime extends IAppProcess {
    sending: ReadableStore<boolean>;
    recipients: ReadableStore<string[]>;
    attachments: ReadableStore<Attachment[]>;
    title: ReadableStore<string>;
    body: ReadableStore<string>;
    replyId: string | undefined;
    service: IMessagingInterface;
    send(): Promise<void>;
    discard(): Promise<boolean | void>;
    sendFailed(): void;
    addAttachment(): Promise<void>;
    filesToAttachments(...files: File[]): Attachment[];
    removeAttachment(uuid: string): void;
    removeRecipient(recipient: string): void;
    isModified(): number;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IMessageBoxRuntime.ts ///

  export interface IMessageBoxRuntime extends IAppProcess {
    data?: MessageBoxData;
    acted: BooleanStore;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IMediaPlayerRuntime.ts ///

  export interface IMediaPlayerRuntime extends IAppProcess {
    queue: ReadableStore<string[]>;
    queueIndex: NumberStore;
    url: StringStore;
    player?: HTMLVideoElement;
    seeking: BooleanStore;
    loopMode: ReadableStore<LoopMode>;
    State: ReadableStore<PlayerState>;
    isVideo: BooleanStore;
    Loaded: BooleanStore;
    playlistPath: StringStore;
    pinControls: BooleanStore;
    MetadataConfiguration: ReadableStore<MetadataConfiguration>;
    CurrentMediaMetadata: ReadableStore<AudioFileMetadata | undefined>;
    CurrentCoverUrl: ReadableStore<string | undefined>;
    LoadingMetadata: BooleanStore;
    mediaSpecificAccentColor: StringStore;
    Configuration: IConfigurator;
  
    setPlayer(player: HTMLVideoElement): void;
    Reset(): void;
    Play(): void;
    Pause(): void;
    Seek(mod: number): void;
    SeekTo(secondTime: number): void;
    Stop(): void;
    SetLoopNone(): void;
    SetLoopAll(): void;
    SetLoopOne(): void;
    updateState(): void | {
      paused: boolean;
      current: number;
      duration: number;
    };
    openFile(): Promise<void>;
    readFile(paths: string[], addToQueue?: boolean): Promise<void>;
    nextSong(): void;
    previousSong(): Promise<void>;
    clearQueue(): void;
    handleSongChange(v: number): Promise<void>;
    addToQueue(): Promise<void>;
    savePlaylist(queue?: string[]): Promise<void>;
    readPlaylist(path: string): Promise<void>;
    createPlaylistShortcut(): Promise<void>;
    folderAsPlaylist(): Promise<void>;
    failedToPlay(e?: any): Promise<void>;
    normalizeMetadata(meta: IAudioMetadata): Promise<AudioFileMetadata>;
    parseMetadata(path: string, apply?: boolean): Promise<ICommandResult<AudioFileMetadata>>;
    setMediaSessionMetadata(metadata?: AudioFileMetadata): Promise<void>;
    parseEntireQueue(): Promise<void>;
    formatTime(seconds: number): string;
    openFileLocation(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IMasterOptionsRuntime.ts ///

  export interface IMasterOptionsRuntime extends IAppProcess {
    loading: BooleanStore;
  
    killGhosts(): Promise<void>;
    killUserApps(): Promise<void>;
    clearProcessCache(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ILoggingRuntime.ts ///

  export interface ILoggingRuntime extends IAppProcess {
    groups: ReadableStore<Map<string, LogItem[]>>;
    sources: ReadableStore<LogSource[]>;
    currentSource: ReadableStore<string>;
    selectedLevel: ReadableStore<FilterLevel>;
    isArchive: boolean;
  
    updateGroups(): void;
    collectLogsBySource(
      logs: LogItem[],
      reverse?: boolean
    ): {
      items: CollectorResult;
      sources: LogSource[];
    };
  }

  /// SOURCE FILE: src/interfaces/runtimes/ILightsOffRuntime.ts ///

  export interface ILightsOffRuntime extends IAppProcess {
    xModifiers: number[];
    yModifiers: number[];
    Grid: ReadableStore<LightsOffGrid>;
    Transitioning: BooleanStore;
    Clicks: NumberStore;
    LEVEL: NumberStore;
    Levels: ILightsOffLevels;
  
    containsLights(): boolean;
    finish(): boolean;
    ToggleLight(x: number, y: number): void;
    loadData(): void;
    saveData(): void;
  }
  
  export interface ILightsOffLevels {
    runtime: ILightsOffRuntime;
  
    loadLevel(level: number): void;
    checkNextLevel(): Promise<boolean>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IItemInfoRuntime.ts ///

  export interface IItemInfoRuntime extends IAppProcess {
    info: ReadableStore<ItemInfo>;
    shortcut: ReadableStore<ArcShortcut>;
  
    open(): Promise<void>;
    openWith(path: string): Promise<void>;
    renameItem(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IImageViewerRuntime.ts ///

  export interface IImageViewerRuntime extends IAppProcess {
    openedFile: ReadableStore<string>;
    imageUrl: ReadableStore<string>;
    indirect: ReadableStore<boolean>;
    viewer: ReadableStore<ImageViewer>;
    scale: NumberStore;
    overridePopulatable: boolean;
  
    readFileDialog(): Promise<void>;
    readFile(path: string): Promise<void>;
    readFileIndirectFallback(path: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IIconPickerRuntime.ts ///

  export interface IIconPickerRuntime extends IAppProcess {
    forWhat?: string; // good question
    defaultIcon?: string;
    selected: StringStore;
    groups: Record<string, Record<string, string>>;
    store: Record<string, string>;
    returnId?: string;
  
    confirm(): Promise<void>;
    cancel(): Promise<void>;
    selectRandom(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IIconEditorRuntime.ts ///

  export interface IIconEditorRuntime extends IAppProcess {
    iconGroups: ReadableStore<Record<string, string[]>>;
    icons: ReadableStore<Record<string, string>>;
    filtered: ReadableStore<Record<string, string>>;
    iconService?: IIconService;
    selectedIcon: ReadableStore<string>;
    selectedGroup: ReadableStore<string>;
    hasChanges: ReadableStore<boolean>;
  
    revert(): void;
    setGroups(): void;
    updateFiltered(v?: string): void;
    save(): Promise<void>;
    editIcon(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IIconEditDialogRuntime.ts ///

  export interface IIconEditDialogRuntime extends IAppProcess {
    iconName?: string;
    returnId?: string;
    type: StringStore;
    values: ReadableStore<Record<string, string>>;
    currentIcon: StringStore;
    defaultIcon?: string;
    sent: boolean;
  
    updateCurrentIcon(type?: string, values?: Record<string, string>): Promise<void>;
    default(): void;
    save(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IGlobalLoadIndicatorRuntime.ts ///

  export interface IGlobalLoadIndicatorRuntime extends IAppProcess {
    caption: StringStore;
    progress: ReadableStore<GlobalLoadIndicatorProgress | undefined>;
  
    updateProgress(progress: Partial<GlobalLoadIndicatorProgress>): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IFsProgressRuntime.ts ///

  export interface IFsProgressRuntime extends IAppProcess {
    Progress: ReadableStore<FsProgressOperation>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IFsProgressFailRuntime.ts ///

  export interface IFsProgressFailRuntime extends IAppProcess {
    prog?: IFsProgressRuntime;
    errors: string[];
    icon: string;
    title: string;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IFirstRunRuntime.ts ///

  export interface IFirstRunRuntime extends IAppProcess {
    done: BooleanStore;
    currentPage: ReadableStore<FirstRunPage>;
    displayName: StringStore;
    switchPage(id: string): void;
    chooseProfilePicture(): void;
    setDisplayName(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IFileManagerRuntime.ts ///

  export interface IFileManagerRuntime extends IAppProcess {
    path: StringStore;
    contents: ReadableStore<DirectoryReadReturn | undefined>;
    shortcuts: ReadableStore<ShortcutStore>;
    loading: BooleanStore;
    errored: BooleanStore;
    selection: ReadableStore<string[]>;
    starting: BooleanStore;
    rootFolders: ReadableStore<FolderEntry[]>;
    drives: ReadableStore<Record<string, QuotedDrive>>;
    notice: ReadableStore<FileManagerNotice | undefined>;
    showNotice: ReadableStore<boolean>;
    loadSave?: LoadSaveDialogData;
    saveName: StringStore;
    virtual: ReadableStore<VirtualFileManagerLocation | undefined>;
    drive: ReadableStore<IFilesystemDrive | undefined>;
    directoryListing: ReadableStore<HTMLDivElement>;
    virtualLocations: Record<string, VirtualFileManagerLocation>;
  
    navigate(path: string): Promise<void>;
    refresh(): Promise<void>;
    lockRefresh(): void;
    unlockRefresh(refresh?: boolean): void;
    parentDir(): void;
    updateDrives(): Promise<void>;
    unmountDrive(drive: IFilesystemDrive, id: string): void;
    confirmUmountDrive(drive: IFilesystemDrive, id: string): Promise<void>;
    updateAltMenu(): void;
    updateRootFolders(): void;
    updateNotice(): Promise<void>;
    setCopyFiles(files?: string[]): void;
    setCutFiles(files?: string[]): void;
    pasteFiles(): Promise<void>;
    uploadItems(): Promise<void>;
    openFile(path: string): void;
    createShortcut(name: string, path: string, folder?: boolean): Promise<void>;
    deleteSelected(): Promise<void>;
    downloadSelected(): Promise<void>;
    singlefySelected(): void;
    updateSelection(e: MouseEvent, path: string): void;
    selectorUp(): Promise<void>;
    selectorDown(): Promise<void>;
    EnterKey(alternative?: boolean): Promise<void>;
    isDirectory(path: string, workingPath?: string): boolean;
    shareAccessIsAdministrative(drive: IFilesystemDrive): boolean;
    DirectoryNotFound(): void;
    SystemFolderDeletionRestricted(userPathKey: string): void;
    confirmLoadSave(): Promise<void>;
    setupLoadSave(loadSave?: LoadSaveDialogData): void;
    handleVirtualLocation(path: string): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IExitRuntime.ts ///

  export interface IExitRuntime extends IAppProcess {
    selected: StringStore;
  
    go(action: ExitAction | undefined, alternate?: boolean): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IDriveInfoRuntime.ts ///

  export interface IDriveInfoRuntime extends IAppProcess {
    drive?: IFilesystemDrive;
    isUserFs: boolean;
    usage?: CategorizedDiskUsage;
    quota?: UserQuota;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IDonutAppRuntime.ts ///

  export interface IDonutAppRuntime extends IAppProcess {
    interval: NodeJS.Timeout;
  
    readonly FPS: number;
    Buffer: StringStore;
    A: number;
    B: number;
  
    Tick(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IContextMenuRuntime.ts ///

  export interface IContextMenuRuntime extends IAppProcess {
    contextData: ReadableStore<ContextMenuInstance | null>;
    CLICKLOCKED: boolean;
    contextProps: Record<string, any[]>;
    currentMenu: StringStore;
  
    assignContextMenuHooks(): void;
    createContextMenu(data: ContextMenuInstance): Promise<void>;
    closeContextMenu(): void;
    handleContext(e: MouseEvent): Promise<void>;
    getWindowByEventTarget(target: EventTarget[]): HTMLDivElement | null;
    getContextEntry(pid: number, scope: string): ContextMenuItem[];
    getContextMenuScope(e: MouseEvent): HTMLDivElement | null;
    composePosition(x: number, y: number, mW: number, mH: number): [number, number];
  }

  /// SOURCE FILE: src/interfaces/runtimes/ICodRuntime.ts ///

  export interface ICodRuntime extends IAppProcess {
    language: ReadableStore<CodLang>;
    buffer: StringStore;
    openedFile: StringStore;
    filename: StringStore;
    mimetype: StringStore;
    directoryName: StringStore;
    original: StringStore;
    drive: ReadableStore<IFilesystemDrive | undefined>;
    mimeIcon: StringStore;
  
    readFile(path: string): Promise<void>;
    saveChanges(force?: boolean): Promise<void>;
    saveAs(): Promise<void>;
    openFile(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/ICalculatorRuntime.ts ///

  export interface ICalculatorRuntime extends IAppProcess {
    Value: ReadableStore<string>;
    Store: ICalculatorStore;
    keys: CalculatorKeys;
    Functions: {
      [key: string]: [string, () => void, string];
    };
  
    evaluate(): string | false;
    generateKeyboardShortcuts(): AppKeyCombination[];
    processKey(key: string): false | undefined;
    validate(expr: string): boolean;
  }
  
  export interface ICalculatorStore {
    AllowedKeys: string[];
    Shortcuts: string[];
    Overrides: CalculatorOverrides;
    altClasses: string[];
  }

  /// SOURCE FILE: src/interfaces/runtimes/IBugHuntUserDataRuntime.ts ///

  export interface IBugHuntUserDataRuntime extends IAppProcess {
    data: UserInfo;
    hljs: HLJSApi;
    html: string;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IBugHuntRuntime.ts ///

  export interface IBugHuntRuntime extends IAppProcess {
    loading: BooleanStore;
    currentTab: StringStore;
    store: ReadableStore<BugReport[]>;
    selectedReport: StringStore;
    bughunt: IBugHuntUserSpaceProcess;
  
    changeTab(tab: string): Promise<void>;
    refresh(tab?: string): Promise<void>;
    invalidateCaches(restoreSelected?: boolean): Promise<void>;
    newReport(): void;
    viewLogs(): void;
    userData(): void;
    exportReport(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IBugHuntCreatorRuntime.ts ///

  export interface IBugHuntCreatorRuntime extends IAppProcess {
    parent: BugHuntProc | undefined;
    title: ReadableStore<string>;
    body: ReadableStore<string>;
    loading: ReadableStore<boolean>;
    overrideOptions: BugHuntCreatorOptions | undefined;
    bughunt: IBugHuntUserSpaceProcess;
  
    Send(): Promise<void>;
    dataPrivacy(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IArcTermColorsRuntime.ts ///

  export interface IArcTermColorsRuntime extends IAppProcess {
    CONFIG_PATH: string;
    arcTermConfiguration: ReadableStore<ArcTermConfiguration>;
    mode: ReadableStore<"presets" | "custom">;
    changed: BooleanStore;
    savePath?: string;
  
    writeDefaultConfiguration(): Promise<void>;
    customFromPreset(preset: ArcTermColorPreset): void;
    choosePreset(preset: ArcTermColorPreset): void;
    savePresetToFile(state?: ArcTermConfiguration): Promise<void>;
    openPreset(): Promise<void>;
    readPresetFromFile(path?: string): Promise<boolean>;
    applyConfiguration(): Promise<void>;
    readConfiguration(): Promise<void>;
    error_savePath(): Promise<boolean>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IArcFindRuntime.ts ///

  export interface IArcFindService extends IBaseService {
    loading: ReadableStore<boolean>;
    searchQuery: ReadableStore<string>;
    searchResults: ReadableStore<FuseResult<SearchItem>[]>;
    searching: ReadableStore<boolean>;
    SelectionIndex: ReadableStore<number>;
  
    refresh(): Promise<SearchItem[] | undefined>;
    getFilesystemSearchSupplier(preferences: UserPreferences): Promise<SearchItem[]>;
    getAppSearchSupplier(preferences: UserPreferences): Promise<SearchItem[]>;
    getFlatTree(): Promise<PathedFileEntry[]>;
    Search(query: string): Promise<
      {
        id: string;
        item: SearchItem;
        refIndex: number;
        score?: number;
        matches?: ReadonlyArray<FuseResultMatch>;
      }[]
    >;
    MutateIndex(e: KeyboardEvent): void | -1;
    Trigger(result: SearchItem): Promise<void>;
    Submit(): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IAppStoreRuntime.ts ///

  export interface IAppStoreRuntime extends IAppProcess {
    searchQuery: StringStore;
    loadingPage: BooleanStore;
    pageProps: ReadableStore<Record<string, any>>;
    searching: BooleanStore;
    currentPage: StringStore;
    operations: Record<string, IInstallerProcessBase>;
    distrib: IDistributionServiceProcess;
  
    switchPage(id: string, props?: Record<string, any>, force?: boolean): Promise<void>;
    Search(): Promise<void>;
    installPackage(
      pkg: StoreItem,
      onDownloadProgress?: FilesystemProgressCallback
    ): Promise<false | 0 | IInstallerProcessBase | "elevateCancel">;
    updatePackage(pkg: StoreItem, onDownloadProgress?: FilesystemProgressCallback): Promise<false | 0 | IInstallerProcessBase>;
    deprecatePackage(pkg: StoreItem): Promise<boolean>;
    deletePackage(pkg: StoreItem): Promise<boolean>;
    publishPackage(): Promise<boolean>;
    updateStoreItem(pkg: StoreItem): Promise<void>;
    readmeFallback(pkg: StoreItem): string;
    learnMoreBlocking(): void;
    registerOperation(id: string, proc: IInstallerProcessBase): boolean;
    discardOperation(id: string): boolean;
    getRunningOperation(pkg: StoreItem): IInstallerProcessBase | undefined;
    viewImage(url: string, name?: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IAppPreinstallRuntime.ts ///

  export interface IAppPreInstallRuntime extends IAppProcess {
    pkgPath: string;
    zip?: JSZip;
    metadata: ReadableStore<ArcPackage>;
  
    fail(reason: string): void;
    install(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IAppInstallerRuntime.ts ///

  export interface IAppInstallerRuntime extends IAppProcess {
    progress?: IInstallerProcessBase;
    metadata?: ArcPackage;
    isLibrary: boolean;
    zip?: JSZip;
  
    revert(): Promise<void>;
    runNow(): void;
    go(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IAppInfoRuntime.ts ///

  export interface IAppInfoRuntime extends IAppProcess {
    targetApp: ReadableStore<App>;
    targetAppId: string;
  
    killAll(): Promise<void>;
    processManager(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IAdvSysSetRuntime.ts ///

  export interface IAdvSysSetRuntime extends IAppProcess {
    currentTab: ReadableStore<string>;
    tabs: Record<string, Component>;
    preferencesBuffer: ReadableStore<UserPreferences>;
    syncInitialized: boolean;
    bufferInitialized: boolean;
    bufferChanged: ReadableStore<boolean>;
    displayingDesync: boolean;
    preferencesSub?: Unsubscriber;
    bufferSub?: Unsubscriber;
  
    apply(close?: boolean): void;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IAddServerRuntime.ts ///

  export interface IAddServerRuntime extends IAppProcess {
    loading: BooleanStore;
    action: StringStore;
  
    addServer(hostname: string, port: number, authCode?: string): Promise<void>;
    createServerUrl(hostname: string, port: number): string;
    testServer(hostname: string, port: number, authCode?: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/runtimes/IAcceleratorOverviewRuntime.ts ///

  export interface IAcceleratorOverviewRuntime extends IAppProcess {
    KnownAcceleratorKeys: string[];
    store: ReadableStore<[string, [string[], string][]][]>;
    apps: ReadableStore<AppStorage>;
    splitAcceleratorString(accelerator: string): string[];
  }

  /// SOURCE FILE: src/interfaces/modules/ISystemDispatch.ts ///

  export interface ISystemDispatch extends IKernelModule {
    subscribers: Record<string, Record<number, (data: any) => void>>;
  
    subscribe<T = any[]>(event: string, callback: (data: T) => void): number;
    unsubscribeId(event: string, id: number): void;
    discardEvent(event: string): void;
    dispatch<T = any[]>(caller: string, data?: T, system?: boolean): SystemDispatchResult;
  }

  /// SOURCE FILE: src/interfaces/modules/ISoundbus.ts ///

  export interface ISoundbus extends IKernelModule {
    playSound(id: string, volume?: number): boolean | undefined;
    stopSound(id: string): boolean;
    getStore(): [string, string][];
    loadExternal(source: string, play?: boolean): void;
  }

  /// SOURCE FILE: src/interfaces/modules/IServerManager.ts ///

  export interface IServerManager extends IKernelModule {
    connected: boolean;
    serverInfo?: ServerInfo;
    previewBranch?: string;
    servers: ServerOption[];
    url?: string;
    hostname?: string;
    authCode?: string;
    get ConnectorAmount(): number;
    get ConnectorNames(): string[];
    checkUsernameAvailability(username: string): Promise<boolean>;
    checkEmailAvailability(username: string): Promise<boolean>;
    switchServer(url: string): Promise<boolean>;
    loadServers(): void;
    writeServers(servers: ServerOption[]): void;
    resetServers(): void;
    addServer(config: ServerOption): boolean;
    removeServer(url: string): boolean;
    isAdded(url: string): boolean;
    GetConn<T extends IServerConnector>(id: string, token: "" | string): T;
  }
  
  export class IServerConnector {
    name: string;
    get server(): AxiosInstance;
  }

  /// SOURCE FILE: src/interfaces/modules/IProcessHandler.ts ///

  export interface IProcessHandler extends IKernelModule {
    BUSY: string;
    IS_BUSY: boolean;
    get MEMORY(): number;
    store: ReadableStore<Map<number, IProcess>>;
    rendererPid: number;
    renderer: IAppRenderer | undefined;
    _init(): Promise<void>;
    startRenderer(initPid: number): Promise<void>;
    spawn<T extends IProcess = IProcess>(
      process: Constructs<T>,
      renderTarget?: HTMLDivElement | undefined,
      userId?: string,
      parentPid?: number | undefined,
      ...args: any[]
    ): Promise<T | undefined>;
    kill(pid: number, force?: boolean): Promise<ProcessKillResult>;
    _killSubProceses(pid: number, force?: boolean): Promise<void>;
    getSubProcesses(parentPid: number): Map<number, IProcess>;
    getProcess<T = IProcess>(pid: number, disposedToo?: boolean): T | undefined;
    getPid(): number;
    isPid(pid: number): boolean;
    ConnectDispatch(pid: number): IProcessDispatch | undefined;
    waitForAvailable(or?: string): Promise<void>;
    getProcessContext(pid: number): ProcessContext | undefined;
  }

  /// SOURCE FILE: src/interfaces/modules/IKernelModule.ts ///

  export interface IKernelModule {
    id: string;
    _init(): Promise<void>;
    __init(): Promise<void>;
    isKmod(): void;
  }

  /// SOURCE FILE: src/interfaces/modules/IFilesystem.ts ///

  export interface IFilesystem extends IKernelModule {
    drives: Record<string, IFilesystemDrive>;
    loadedProxies: IFilesystemProxy[];
    _init(): Promise<void>;
    getDriveById(id: string): IFilesystemDrive;
    mountDrive<T extends IFilesystemDrive = IFilesystemDrive>(
      id: string,
      supplier: Constructs<T>,
      letter?: string,
      onProgress?: FilesystemProgressCallback,
      ...args: any[]
    ): Promise<T | false>;
    getDriveIdByIdentifier(identifier: string): string;
    umountDrive(id: string, fromSystem?: boolean, onProgress?: FilesystemProgressCallback): Promise<boolean>;
    umountAllOfType(identifiesAs: string, fromSystem?: boolean): Promise<ICommandResult>;
    getDriveByLetter(letter: string, error?: boolean): IFilesystemDrive;
    getDriveIdentifier(path: string): string;
    getDriveByPath(path: string): IFilesystemDrive;
    validatePath(p: string): void;
    removeDriveLetter(p: string): string;
    validateDriveLetter(letter: string): void;
    getProxyInfo(p: string, topLevel?: boolean): FsProxyInfo | undefined;
    tryGetProxyInfo(p: string, topLevel?: boolean): FsProxyInfo | undefined;
    tryHandleProxyReadDir(p: string): Promise<DirectoryReadReturn | undefined>;
    tryHandleProxyReadFile(p: string): Promise<ArrayBuffer | undefined>;
    readDir(path: string): Promise<DirectoryReadReturn | undefined>;
    bulk<T = any>(path: string, extension: string): Promise<Record<string, T>>;
    createDirectory(path: string, dispatch?: boolean): Promise<boolean>;
    readFile(path: string, onProgress?: FilesystemProgressCallback): Promise<ArrayBuffer | undefined>;
    writeFile(path: string, data: Blob, onProgress?: FilesystemProgressCallback, dispatch?: boolean): Promise<boolean>;
    tree(path: string): Promise<RecursiveDirectoryReadReturn | undefined>;
    copyItem(source: string, destination: string, dispatch?: boolean, onProgress?: FilesystemProgressCallback): Promise<boolean>;
    moveItem(source: string, destination: string, dispatch?: boolean, onProgress?: FilesystemProgressCallback): Promise<boolean>;
    deleteItem(path: string, dispatch?: boolean): Promise<boolean>;
    uploadFiles(
      target: string,
      accept?: string,
      multiple?: boolean,
      onProgress?: FilesystemProgressCallback
    ): Promise<UploadReturn>;
    defaultProgress(d: FilesystemProgress): void;
    lockFile(path: string, pid: number): Promise<void>;
    releaseLock(path: string, pid: number): Promise<void>;
    direct(path: string): Promise<string | undefined>;
    nextAvailableDriveLetter(): string | undefined;
    isDirectory(path: string): Promise<false | DirectoryReadReturn>;
    stat(path: string): Promise<ExtendedStat | undefined>;
    imageThumbnail(path: string, width: number, height?: number): Promise<string | undefined>;
  }

  /// SOURCE FILE: src/interfaces/modules/IEnvironment.ts ///

  export interface IEnvironment extends IKernelModule {
    _init(): Promise<void>;
    delete(key: string): boolean;
    get(key: string): any;
    getMultiple(keys: string[]): any[];
    getAll(): Record<string, string>;
    setReadonly(key: string): void;
    setWritable(key: string): void;
    set(key: string, value: any): boolean;
    setMultiple(entries: [string, any][]): void;
    reset(): void;
  }

  /// SOURCE FILE: src/interfaces/modules/IBugHunt.ts ///

  export interface IBugHunt extends IKernelModule {
    _init(): Promise<void>;
    createReport(options?: ReportOptions, app?: App, storeItemId?: string): OutgoingBugReport;
    sendReport(outgoing: OutgoingBugReport, token?: string, options?: ReportOptions): Promise<boolean>;
    getToken(): string;
    getUserBugReports(token: string): Promise<BugReport[]>;
    getPublicBugReports(token: string): Promise<BugReport[]>;
  }

  /// SOURCE FILE: src/interfaces/drives/ISharedDrive.ts ///

  export interface ISharedDrive extends IFilesystemDrive {
    shareId?: string;
    shareInfo: SharedDriveType;
  }

  /// SOURCE FILE: src/interfaces/drives/IMemoryFilesystemDrive.ts ///

  export interface IMemoryFilesystemDrive extends IFilesystemDrive {
    takeSnapshot(): Promise<Record<string, any>>;
    restoreSnapshot(snapshot: Record<string, any>): void;
  }

  /// SOURCE FILE: src/interfaces/drives/ILegacyServerDrive.ts ///

  export interface ILegacyServerDrive extends IFilesystemDrive {
    TEST_MODES: [boolean, number][];
    DEFAULT_DIRECTORY: UserDirectory;
    DEFAULT_QUOTA: FSQuota;
    legacy_readDir(path: string): Promise<UserDirectory>;
    legacy_readFile(path: string): Promise<ArrayBuffer | undefined>;
    legacy_testConnection(server: string, authCode?: string): Promise<false | { proto: string; port: number; url: string }>;
    legacy_generateToken(username: string, password: string): Promise<boolean>;
    legacy_quota(): Promise<FSQuota>;
  }
  // !end-tpa

  /// SOURCE FILE: src/interfaces/contexts/IWorkspaceUserContext.ts ///

  export interface IWorkspaceUserContext extends IUserContext {
    virtualDesktop: HTMLDivElement | undefined;
    syncVirtualDesktops(v: UserPreferences): Promise<void>;
    renderVirtualDesktop(uuid: string): void;
    deleteVirtualDesktop(uuid: string): Promise<void>;
    getCurrentDesktop(): HTMLDivElement | undefined;
    createWorkspace(name?: string): void;
    getDesktopIndexByUuid(uuid: string): number;
    switchToDesktopByUuid(uuid: string): void;
    killWindowsOfDesktop(uuid: string): Promise<boolean | undefined>;
    nextDesktop(): boolean;
    previousDesktop(): void;
    moveWindow(pid: number, destination: string): Promise<void>;
    deleteVirtualDesktopAck(workspace: Workspace): Promise<void>;
    startVirtualDesktops(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IWallpaperUserContext.ts ///

  export interface IWallpaperUserContext extends IUserContext {
    Wallpaper: ReadableStore<Wallpaper>;
    lastWallpaper: ReadableStore<string>;
    updateWallpaper(v: UserPreferences): Promise<void>;
    uploadWallpaper(pid?: number): Promise<Wallpaper | undefined>;
    getWallpaper(id: string, override?: string): Promise<Wallpaper>;
    deleteLocalWallpaper(id: string): Promise<boolean>;
    getLocalWallpaper(id: string): Promise<Wallpaper>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IVersionUserContext.ts ///

  export interface IVersionUserContext extends IUserContext {
    isRegisteredVersionOutdated(): Promise<boolean>;
    updateRegisteredVersion(): Promise<void>;
    checkForNewVersion(): Promise<void>;
    mountSourceDrive(): Promise<IFilesystemDrive | false>;
    enableSourceDrive(openAlso?: boolean): Promise<boolean>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IThemesUserContext.ts ///

  export interface IThemesUserContext extends IUserContext {
    themeFromUserPreferences(data: UserPreferences, name: string, author: string, version: string): UserTheme;
    saveCurrentTheme(name: string): void;
    applyThemeData(data: UserTheme, id?: string): boolean | undefined;
    applySavedTheme(id: string): void;
    verifyTheme(data: UserTheme): string | undefined;
    checkCurrentThemeIdValidity(data: UserPreferences): UserPreferences;
    deleteUserTheme(id: string): void;
    exportTheme(theme: UserTheme, runtime: number): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/contexts/ISpawnUserContext.ts ///

  export interface ISpawnUserContext extends IUserContext {
    spawnAppMeta<T extends IProcess>(
      app: App,
      parentPid?: number,
      options?: AppProcessSpawnOptions,
      ...args: any[]
    ): Promise<T | undefined>;
    spawnApp<T extends IProcess>(
      id: string,
      parentPid?: number,
      options?: AppProcessSpawnOptions,
      ...args: any[]
    ): Promise<T | undefined>;
    tpaEntrypoint(app: InstalledApp, ...args: any[]): Promise<ICommandResult<TpaSpawnEntrypointResult>>;
    tpaError_noEnableThirdParty(): void;
    clearEntrypointCache(): void;
  }

  /// SOURCE FILE: src/interfaces/contexts/IShortcutsUserContext.ts ///

  export interface IShortcutsUserContext extends IUserContext {
    handleShortcut(path: string, shortcut: ArcShortcut): Promise<any>;
    createShortcut(data: ArcShortcut, path: string, dispatch?: boolean): Promise<boolean>;
    newShortcut(location: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IPreferencesUserContext.ts ///

  export interface IPreferencesUserContext extends IUserContext {
    syncLock: boolean;
    preferencesUnsubscribe: Unsubscriber | undefined;
    preferences: ReadableStore<UserPreferences>;
    _deactivate(): Promise<void>;
    commitPreferences(preferences: UserPreferences): Promise<boolean | undefined>;
    sanitizeUserPreferences(): Promise<void>;
    getGlobalSetting(key: string): any;
    setGlobalSetting(key: string, value: any): void;
    changeProfilePicture(newValue: string | number): void;
    uploadProfilePicture(): Promise<string | undefined>;
    changeShell(id: string): Promise<boolean>;
    startPreferencesSync(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IPowerUserContext.ts ///

  export interface IPowerUserContext extends IUserContext {
    battery: ReadableStore<BatteryType | undefined>;
    logoff(force?: boolean): Promise<void>;
    shutdown(force?: boolean): Promise<void>;
    restart(force?: boolean): Promise<void>;
    logoffSafeMode(force?: boolean): Promise<void>;
    toLogin(type: string, props?: Record<string, any>, force?: boolean): Promise<void>;
    closeOpenedApps(type: string, props?: Record<string, any>, force?: boolean): Promise<boolean>;
    batteryInfo(): Promise<BatteryType | undefined>;
  }

  /// SOURCE FILE: src/interfaces/contexts/INotificationsUserContext.ts ///

  export interface INotificationsUserContext extends IUserContext {
    notifications: Map<string, Notification>;
    sendNotification(data: Notification): string | undefined;
    deleteNotification(id: string): void;
    clearNotifications(): void;
  }

  /// SOURCE FILE: src/interfaces/contexts/ILoginActivityUserContext.ts ///

  export interface ILoginActivityUserContext extends IUserContext {
    getLoginActivity(): Promise<LoginActivity[]>;
    logActivity(action: string): Promise<boolean>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IInitUserContext.ts ///

  export interface IInitUserContext extends IUserContext {
    anchorInterceptObserver?: MutationObserver;
    _init(): Promise<void>;
    _deactivate(): Promise<void>;
    startAnchorRedirectionIntercept(): void;
    startSystemStatusRefresh(): Promise<void>;
    startServiceHost(broadcast?: (msg: string) => void): Promise<void>;
    firstRun(): Promise<void>;
    handleShellAndAutorun(): Promise<void>;
    startFilesystemSupplier(): Promise<void>;
    startDriveNotifierWatcher(): void;
  }

  /// SOURCE FILE: src/interfaces/contexts/IIconsUserContext.ts ///

  export interface IIconsUserContext extends IUserContext {
    getAppIcon(app: App): string;
    getAppIconByProcess(process: IAppProcess): string;
    getIcon(id: string): Promise<string>;
    getIconCached(id: string): string;
    getIconStore(id: string): ReadableStore<string>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IHelpersUserContext.ts ///

  export interface IHelpersUserContext extends IUserContext {
    GlobalLoadIndicator(
      caption?: string,
      pid?: number,
      progress?: Partial<GlobalLoadIndicatorProgress>
    ): Promise<{
      caption: ReadableStore<string>;
      stop: () => Promise<void>;
      incrementProgress?: ((amount?: number) => void) | undefined;
      progress?: ReadableStore<GlobalLoadIndicatorProgress | undefined> | undefined;
    }>;
    Confirm(title: string, message: string, no: string, yes: string, image?: string, pid?: number): Promise<unknown>;
    TerminalWindow(pid?: number): Promise<ExpandedTerminal | undefined>;
    IconPicker(data: Omit<IconPickerData, "returnId">): Promise<string | undefined>;
    IconEditor(initialValue: string, defaultIcon?: string, name?: string): Promise<string>;
    ParentIs(proc: IAppProcess, appId: string): boolean | undefined;
    waitForLeaveInvocationAllow(): Promise<void>;
    safeModeNotice(): void;
    iHaveFeedback(process: IAppProcess): void;
    openWebpage(href: string): void;
    submitBetaFeedback(title: string, message: string): Promise<ICommandResult>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IFilesystemUserContext.ts ///

  export interface IFilesystemUserContext extends IUserContext {
    TempFs?: IMemoryFilesystemDrive;
    fileHandlers: Record<string, FileHandler>;
    mountedDrives: string[];
    _init(): Promise<void>;
    _deactivate(): Promise<void>;
    mountZip(path: string, letter?: string, fromSystem?: boolean): Promise<false | IFilesystemDrive | undefined>;
    unmountMountedDrives(): Promise<void>;
    FileProgress(initialData: Partial<FsProgressOperation>, parentPid?: number): Promise<FileProgressMutator>;
    moveMultiple(sources: string[], destination: string, pid: number): Promise<void>;
    copyMultiple(sources: string[], destination: string, pid: number): Promise<void>;
    findHandlerToOpenFile(path: string): Promise<FileOpenerResult[]>;
    getAllFileHandlers(): Promise<FileOpenerResult[]>;
    LoadSaveDialog(data: Omit<LoadSaveDialogData, "returnId">): Promise<string[] | [undefined]>;
    openFile(path: string, shortcut?: ArcShortcut): Promise<any>;
    openWith(path: string): Promise<void>;
    determineCategorizedDiskUsage(): Promise<CategorizedDiskUsage>;
    getThumbnailFor(path: string): Promise<string | undefined>;
    mountLegacyFilesystem(connectionInfo: LegacyConnectionInfo): Promise<false | ILegacyServerDrive>;
    moveToTrashOrDeleteItem(path: string, dispatch?: boolean): Promise<boolean>;
    moveToTrashOrDeleteItemAck(directory: string, paths: string[], dispatch?: boolean): Promise<void>;
    mountSourceDrive(): Promise<IFilesystemDrive | false>;
    uploadItems(path: string): Promise<ICommandResult<UploadReturn>>;
    setCopyList(paths: string[]): void;
    setCutList(paths: string[]): void;
    pasteItems(destination: string): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IElevationUserContext.ts ///

  export interface IElevationUserContext extends IUserContext {
    _elevating: boolean;
    elevate(id: string): Promise<unknown>;
    manuallyElevate(data: ElevationData): Promise<unknown>;
    loadElevation(id: string, data: ElevationData): void;
  }

  /// SOURCE FILE: src/interfaces/contexts/IChecksUserContext.ts ///

  export interface IChecksUserContext extends IUserContext {
    NIGHTLY: boolean;
    checkReducedMotion(): void;
    checkForUpdates(): Promise<void>;
    checkNightly(): void;
  }

  /// SOURCE FILE: src/interfaces/contexts/IApplicationsUserContext.ts ///

  export interface IApplicationsUserContext extends IUserContext {
    checkDisabled(appId: string, noSafeMode?: boolean): boolean;
    isVital(app: App): boolean | undefined;
    isPopulatableByAppIdSync(appId: string): boolean;
    disableApp(appId: string): Promise<false | undefined>;
    enableApp(appId: string): Promise<false | undefined>;
    enableThirdParty(): Promise<void>;
    disableThirdParty(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IAppRendererUserContext.ts ///

  export interface IAppRendererUserContext extends IUserContext {
    _deactivate(): Promise<void>;
    getAppRendererStyle(accent: string): string;
    setAppRendererClasses(v: UserPreferences): Promise<void>;
    setUserStyleLoader(style: CustomStylePreferences): void;
  }

  /// SOURCE FILE: src/interfaces/contexts/IAppRegistrationUserContext.ts ///

  export interface IAppRegistrationUserContext extends IUserContext {
    getUserApps(): Promise<AppStorage>;
    registerApp(data: InstalledApp): Promise<void>;
    uninstallPackageWithStatus(id: string, deleteFiles?: boolean): Promise<boolean>;
    registerAppFromPath(
      path: string
    ): Promise<"failed to read file" | "failed to convert to JSON" | "missing properties" | undefined>;
    uninstallAppWithAck(app: App): Promise<boolean>;
    pinApp(appId: string): Promise<void>;
    unpinApp(appId: string): void;
    determineStartMenuShortcutPath(app: App): string | undefined;
    addToStartMenu(appId: string): Promise<void>;
    removeFromStartMenu(appId: string): Promise<void>;
    updateStartMenuFolder(quiet?: boolean): Promise<void>;
    modeUserAppsToFs(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/contexts/IAccountUserContext.ts ///

  export interface IAccountUserContext extends IUserContext {
    discontinueToken(token?: string): Promise<boolean | undefined>;
    getUserInfo(): Promise<ICommandResult<UserInfo>>;
    changeUsername(newUsername: string): Promise<boolean>;
    changePassword(newPassword: string): Promise<boolean>;
    getPublicUserInfoOf(userId: string): Promise<PublicUserInfo | undefined>;
    deleteAccount(): Promise<void>;
  }

  /// SOURCE FILE: src/interfaces/modules/server/IUserConnector.ts ///

  export class IUserConnector extends IServerConnector {
    Self(): Promise<ICommandResult<UserInfo>>;
    Rename(newUsername: string): Promise<ICommandResult>;
    ChangePassword(newPassword: string): Promise<ICommandResult>;
    Info(userId: string): Promise<ICommandResult<PublicUserInfo>>;
    PreferencesPut(preferences: UserPreferences): Promise<ICommandResult>;
    AvailabilityUsername(username: string): Promise<ICommandResult>;
    AvailabilityEmail(email: string): Promise<ICommandResult>;
    DispatchGet(): Promise<ICommandResult<GlobalDispatchClient[]>>;
    DispatchKick(clientId: string): Promise<ICommandResult>;
    PictureUrl(userId: string): string;
    LoginBgUrl(userId: string): string;
  }

  /// SOURCE FILE: src/interfaces/modules/server/ITpaConnector.ts ///

  export interface ITpaConnector extends IServerConnector {
    CreateUrl(contents: string, userId: string, appId: string, filename: string): Promise<ICommandResult>;
    ScriptUrl(userId: string, appId: string, filename: string): string;
  }

  /// SOURCE FILE: src/interfaces/modules/server/ITotpConnector.ts ///

  export interface ITotpConnector extends IServerConnector {
    Activate(code: string): Promise<ICommandResult>;
    Auth(code: string): Promise<ICommandResult>;
    Delete(): Promise<ICommandResult<DeleteResult>>;
    Setup(): Promise<ICommandResult<TotpSetupResponse>>;
    Unlock(code: string): Promise<ICommandResult<UpdateWriteOpResult>>;
  }

  /// SOURCE FILE: src/interfaces/modules/server/IStoreConnector.ts ///

  export interface IStoreConnector extends IServerConnector {
    GetPackageById(id: string): Promise<ICommandResult<StoreItem>>;
    GetPackageByName(name: string): Promise<ICommandResult<StoreItem>>;
    DeleteStoreItem(id: string): Promise<ICommandResult>;
    DeprecateStoreItem(id: string): Promise<ICommandResult>;
    GetPublishedStoreItems(): Promise<ICommandResult<StoreItem[]>>;
    PublishStoreItem(data: Blob, onProgress?: FilesystemProgressCallback): Promise<ICommandResult>;
    UpdateStoreItem(id: string, data: Blob, onProgress?: FilesystemProgressCallback): Promise<ICommandResult<UpdateWriteOpResult>>;
    Download(id: string, onProgress?: FilesystemProgressCallback): Promise<ICommandResult<ArrayBuffer>>;
    GetAllStoreItems(): Promise<ICommandResult<PartialStoreItem[]>>;
    SearchStoreItems(query: string): Promise<ICommandResult<PartialStoreItem[]>>;
    GetPackageReadme(id: string): Promise<ICommandResult<string>>;
  }

  /// SOURCE FILE: src/interfaces/modules/server/IShareConnector.ts ///

  export interface IShareConnector extends IServerConnector {
    DirGet(shareId: string, path?: string): Promise<ICommandResult<DirectoryReadReturn>>;
    DirPost(shareId: string, path: string): Promise<ICommandResult>;
    FileGet(shareId: string, path: string, onProgress?: FilesystemProgressCallback): Promise<ICommandResult<ArrayBuffer>>;
    FilePost(shareId: string, path: string, blob: Blob, onProgress?: FilesystemProgressCallback): Promise<ICommandResult>;
    TreeGet(shareId: string, path?: string): Promise<ICommandResult<RecursiveDirectoryReadReturn>>;
    CpPost(shareId: string, source: string, destination: string): Promise<ICommandResult>;
    MvPost(shareId: string, source: string, destination: string): Promise<ICommandResult>;
    RmDelete(shareId: string, path: string): Promise<ICommandResult>;
    QuotaGet(shareId: string): Promise<ICommandResult<UserQuota>>;
    AccessorPost(shareId: string, path: string): Promise<ICommandResult<string>>;
    BulkGet<T = any>(shareId: string, ext: string, path: string): Promise<ICommandResult<Record<string, T>>>;
    StatGet(shareId: string, path: string): Promise<ICommandResult<ExtendedStat>>;
    ThumbnailGet(shareId: string, path: string, width: number, height?: number): Promise<ICommandResult<string>>;
    OwnedGet(): Promise<ICommandResult<SharedDriveType[]>>;
    JoinedGet(): Promise<ICommandResult<SharedDriveType[]>>;
    Create(name: string, password: string): Promise<ICommandResult<SharedDriveType>>;
    Delete(shareId: string): Promise<ICommandResult>;
    ChangePswdPost(shareId: string, newPassword: string): Promise<ICommandResult>;
    RenamePost(shareId: string, newName: string): Promise<ICommandResult>;
    JoinPost(username: string, shareName: string, password: string): Promise<ICommandResult>;
    LeavePost(shareId: string): Promise<ICommandResult>;
    KickPost(shareId: string, userId: string): Promise<ICommandResult>;
    MembersGet(shareId: string): Promise<ICommandResult<Record<string, string>>>;
    InfoByName(username: string, shareName: string): Promise<ICommandResult<SharedDriveType>>;
    InfoById(shareId: string): Promise<ICommandResult<SharedDriveType>>;
  }

  /// SOURCE FILE: src/interfaces/modules/server/IMessagingConnector.ts ///

  export interface IMessagingConnector extends IServerConnector {
    AttachmentRead(
      messageId: string,
      attachmentId: string,
      onProgress?: FilesystemProgressCallback
    ): Promise<ICommandResult<ArrayBuffer>>;
    Thread(messageId?: string): Promise<ICommandResult<ExpandedMessageNode[]>>;
    Delete(messageId: string): Promise<ICommandResult>;
    Inbox(): Promise<ICommandResult<ExpandedMessage[]>>;
    Create(
      subject: string,
      recipients: string[],
      body: string,
      attachments: File[],
      repliesTo?: string,
      onProgress?: FilesystemProgressCallback
    ): Promise<ICommandResult<Message[]>>;
    Read(messageId: string): Promise<ICommandResult<ExpandedMessage>>;
    Received(): Promise<ICommandResult<ExpandedMessage[]>>;
    Sent(): Promise<ICommandResult<ExpandedMessage[]>>;
  }

  /// SOURCE FILE: src/apps/user/sqeleton/types.ts ///

  export interface SqlTable {
    uuid: string;
    name: string;
    rootpage: number;
    sql: string;
    tbl_name: string;
    type: string;
    columns: SqlTableColumn[];
  }
  
  export interface SqlTableColumn {
    cid: number;
    name: string;
    type: string;
    notnull: IntBool;
    dflt_value: any;
    pk: IntBool;
    uuid: string;
  }
  
  export interface SqeletonTab {
    name: string;
    count?: ReadableStore<any[]>;
    className?: string;
  }
  
  export type SqeletonTabs = Record<string, SqeletonTab>;
  
  export interface SqeletonError {
    uuid: string;
    sql: string;
    timestamp: number;
    text: string;
    system: boolean;
  }
  
  export interface SqeletonHistoryItem {
    uuid: string;
    sql: string;
    timestamp: number;
    result: Record<string, any>[][];
    system: boolean;
  }

  /// SOURCE FILE: src/apps/user/qlorb/types.ts ///

  export interface Box {
    modifier: number;
    class: string;
    yoffset: number;
  }

  /// SOURCE FILE: src/apps/user/messages/types.ts ///

  export interface MessagingPage {
    name: string;
    icon: string;
    supplier: (process: IMessagingAppRuntime) => Promise<ExpandedMessage[]> | ExpandedMessage[];
  }

  /// SOURCE FILE: src/apps/user/mediaplayer/types.ts ///

  export enum LoopMode {
    None = 0,
    All = 1,
    One = 2,
  }
  
  export interface PlayerState {
    paused: boolean;
    current: number;
    duration: number;
  }
  
  export interface AudioFileMetadata {
    coverImagePath?: string;
    artist?: string;
    title?: string;
    album?: string;
    year?: number;
    genre?: string;
  }
  
  export type MetadataConfiguration = Record<string, AudioFileMetadata>; // R<path, meta>

  /// SOURCE FILE: src/apps/user/logging/types.ts ///

  export type CollectorResult = { [key: string]: LogItem[] };
  export type IterableCollectorResult = [string, LogItem[]][];
  export type FilterLevel = LogLevel | "all";
  export type GroupedBySource = Map<string, LogItem[]>;
  export type CurrentSource = ReadableStore<string>;
  export type LogSource = { what: string; timestamp: number };

  /// SOURCE FILE: src/apps/user/lightsoff/types.ts ///

  export type LightsOffGrid = boolean[][]; // [[false,false,false,false,false],...]

  /// SOURCE FILE: src/apps/user/filemanager/types.ts ///

  export type QuotedDrive = { data: IFilesystemDrive; quota: UserQuota };
  
  export interface LoadSaveDialogData {
    title: string;
    icon: string;
    startDir?: string;
    isSave?: boolean;
    targetPid?: number;
    extensions?: string[];
    returnId: string;
    saveName?: string;
    multiple?: boolean;
    folder?: boolean;
  }
  
  export interface FileManagerNotice {
    icon: string;
    text: string;
    className?: string;
  }
  
  export interface VirtualFileManagerLocation {
    name: string;
    icon: string;
    component: Component;
    hidden?: boolean;
  }
  

  /// SOURCE FILE: src/apps/user/cod/types.ts ///

  export type CodLang =
    | "css"
    | "ini"
    | "javascript"
    | "typescript"
    | "json"
    | "markdown"
    | "xml"
    | "yaml"
    | "plaintext"
    | "sql"
    | "basic";

  /// SOURCE FILE: src/apps/user/calculator/types.ts ///

  export type CalculatorKey = [string | null, string | null]; // key,mod
  export type CalculatorKeys = [string | null, string | null][];
  export type CalculatorOverrides = { [key: string]: string };

  /// SOURCE FILE: src/apps/user/bughuntcreator/types.ts ///

  export interface BugHuntCreatorOptions {
    sendAnonymously: boolean;
    excludeLogs: boolean;
    makePublic: boolean;
  }

  /// SOURCE FILE: src/apps/components/wallpaper/types.ts ///

  export interface DesktopIconPos {
    x: number;
    y: number;
  }
  
  export type DesktopIcons = Record<string, DesktopIconPos>;

  /// SOURCE FILE: src/apps/components/shell/types.ts ///

  
  export interface QuickSetting {
    isActive: (process: IShellRuntime) => boolean | Promise<boolean>;
    action: (process: IShellRuntime) => any;
    icon: string;
    className?: string;
    caption: string;
  }
  
  export interface StartMenuAction {
    caption: string;
    icon: string;
    action: (process: IShellRuntime) => void;
    className?: string;
  }
  

  /// SOURCE FILE: src/apps/components/multiupdategui/types.ts ///

  export interface MultiUpdateStatusNode {
    state: "pending" | "working" | "success" | "failed" | "downloading";
    max: number;
    done: number;
    pkg: StoreItem;
  }
  
  export type MultiUpdateStatus = MultiUpdateStatusNode[];

  /// SOURCE FILE: src/apps/components/messagecomposer/types.ts ///

  export interface Attachment {
    data: File;
    uuid: string;
  }

  /// SOURCE FILE: src/apps/components/iteminfo/types.ts ///

  export interface ItemInfo {
    meta: {
      sort: "file" | "folder";
      mimetype?: string;
      size?: number;
      created: string;
      modified: string;
    };
    location: {
      fullPath: string;
      extension?: string;
      parent?: string;
      drive?: string;
      driveFs?: string;
    };
    isFolder: boolean;
    isShortcut: boolean;
    name: string;
  }

  /// SOURCE FILE: src/apps/components/iconpicker/types.ts ///

  export interface IconPickerData {
    forWhat: string;
    defaultIcon: string;
    returnId: string;
  }

  /// SOURCE FILE: src/apps/components/globalloadindicator/types.ts ///

  export interface GlobalLoadIndicatorProgress {
    max: number;
    value: number;
    useHtml?: boolean;
  }

  /// SOURCE FILE: src/apps/components/fsprogress/types.ts ///

  export interface FsProgressOperation {
    type: "quantity" | "size" | "none";
    icon: string;
    caption: string;
    subtitle: string;
    done: number;
    max: number;
    cancel?: () => void;
    errors: string[];
  }
  
  export interface FileProgressMutator {
    progress: ReadableStore<FsProgressOperation>;
    mutateMax: (mutator: number) => void;
    mutDone: (mutator: number) => void;
    mutErr: (mutator: string) => void;
    setMax: (value: number) => void;
    setDone: (value: number) => void;
    setErrors: (value: string[]) => void;
    setCancel: (cancel: (() => void) | undefined) => void;
    updateCaption: (caption: string) => void;
    updSub: (subtitle: string) => void;
    stop: () => Promise<any>;
    show: () => Promise<any>;
    setType: (type: "quantity" | "size" | "none") => void;
    process: () => IFsProgressRuntime | undefined;
  }

  /// SOURCE FILE: src/apps/components/firstrun/types.ts ///

  export interface FirstRunPage {
    name: string;
    component: any;
    hero?: boolean;
    actions: {
      left: Action[];
      right: Action[];
    };
  }
  
  export interface Action {
    caption: string;
    suggested?: boolean;
    disabled?: boolean;
    action: (process: IFirstRunRuntime) => void;
  }
  
  export interface FirstRunTheme {
    name: string;
    subtitle: string;
    image: string;
    configuration: {
      style: string;
      wallpaper: string;
      accent: string;
    };
  }

  /// SOURCE FILE: src/apps/components/exit/types.ts ///

  export interface ExitAction {
    caption: string;
    action: (daemon: IUserDaemon) => void;
    alternateAction?: (daemon: IUserDaemon) => void; // Action upon submit w/ shift key
    alternateCaption?: string;
    icon: string;
  }

  /// SOURCE FILE: src/apps/components/arctermcolors/types.ts ///

  export interface ArcTermColors {
    red: string;
    green: string;
    yellow: string;
    blue: string;
    cyan: string;
    magenta: string;
    foreground: string;
    background: string;
    brightBlack: string;
    backdropOpacity: number;
  }
  
  export interface ArcTermColorPreset extends ArcTermColors {
    name: string;
    author: string;
    variant: "light" | "dark";
  }
}

export {};