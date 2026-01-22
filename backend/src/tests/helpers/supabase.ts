const chainReturn = () => function (this: any) { return this; };

export const createSupabaseChain = (data: any, error: any = null, count: number | null = null) => {
    const chain: any = {
        select: chainReturn(),
        insert: chainReturn(),
        update: chainReturn(),
        delete: chainReturn(),
        eq: chainReturn(),
        in: chainReturn(),
        is: chainReturn(),
        ilike: chainReturn(),
        or: chainReturn(),
        order: chainReturn(),
        range: chainReturn(),
        gte: chainReturn(),
        lte: chainReturn(),
        neq: chainReturn(),
        single: () => Promise.resolve({ data, error }),
        maybeSingle: () => Promise.resolve({ data, error }),
        then: (resolve: any) =>
            resolve({
                data,
                error,
                count: count ?? (Array.isArray(data) ? data.length : 0),
            }),
    };
    return chain;
};
