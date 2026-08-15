import { TestBed } from '@angular/core/testing';

import { FossilService } from './fossil-service';

describe('FossilService', () => {
  let service: FossilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FossilService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should track plants as state', () => {
    const before = service.count();
    service.add({ id: 'test', name: 'Test', powerKw: 1 });
    expect(service.count()).toBe(before + 1);

    service.remove('test');
    expect(service.count()).toBe(before);
  });
});
