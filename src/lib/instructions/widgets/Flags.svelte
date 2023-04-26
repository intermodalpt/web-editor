<script>
    export let flagsData = [];
</script>

<div class="rounded-lg border-base-300 border-l-2 border-r-2 basis-64">
    {#each flagsData as flag, i}
        <table class="table table-compact w-full">
            <thead>
                <tr>
                    <th class="text-xs">Id</th>
                    <th class="w-full">
                        <input
                            type="text"
                            class="w-40 input input-xs input-bordered px-0"
                            bind:value={flag.id}
                            disabled
                        />
                    </th>
                </tr>
                <tr>
                    <th class="text-xs">Nome</th>
                    <th class="w-full">
                        <input
                            type="text"
                            class="w-40 input input-xs input-bordered px-0"
                            bind:value={flag.name}
                            disabled
                        />
                    </th>
                </tr>
            </thead>
        </table>
        <div class="flex flex-wrap">
            {#each flag.route_codes as code, j}
                <div class="badge badge-outline badge-lg">{code}</div>
            {/each}
        </div>
        <hr />
    {/each}
</div>