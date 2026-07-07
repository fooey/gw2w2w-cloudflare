interface ClipboardLike {
  writeText: (text: string) => Promise<void>;
}

export async function tryWriteClipboardText(text: string, clipboard: ClipboardLike): Promise<boolean> {
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
