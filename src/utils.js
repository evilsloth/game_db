export function toMap(list, keyGetter) {
    const map = new Map()

    list.forEach(item => map.set(keyGetter(item), item));

    return map;
}

export function defaultValue(value, defaultValue) {
    if (value != null) {
        return value
    }
    
    return defaultValue != null ? defaultValue : undefined;
}